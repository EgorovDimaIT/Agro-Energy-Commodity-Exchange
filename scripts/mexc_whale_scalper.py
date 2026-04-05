import sys
import os
import websocket
import json
import time
import threading
import requests
import statistics
import concurrent.futures
import re
import copy
from colorama import init, Fore, Style, Back
from dotenv import load_dotenv

# === LOAD ENV ===
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env.local'))

# === UTF-8 ДЛЯ WINDOWS ===
if os.name == "nt":
    os.system("chcp 65001 > nul")
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

init(autoreset=True)

# === ТЕЛЕГРАМ ===
TG_TOKEN = os.getenv('TG_TOKEN', '7703902457:AAFOVuPw5a8-PAdJV4zhCrEaMBUy_BUNx7s')
TG_CHAT_ID = os.getenv('TG_CHAT_ID', '1011966727')


def send_telegram(message):
    def _send():
        try:
            url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
            payload = {"chat_id": TG_CHAT_ID, "text": message}
            requests.post(url, data=payload, timeout=8)
        except Exception:
            pass
    threading.Thread(target=_send, daemon=True).start()


# === НАСТРОЙКИ ТОРГОВЛИ (MEXC SPOT) ===
START_BALANCE = 10.0
LEVERAGE = 1
TRADE_SIZE_PCT = 0.95
MAX_POSITIONS = 1
COOLDOWN_AFTER_TRADE = 60

NET_TP_PCT = 0.05 / 100
BREAKEVEN_TRIGGER = 0.15 / 100
STOP_LOSS_PCT = 0.15 / 100

# === КОМИССИИ MEXC SPOT ===
TAKER_FEE = 0.0000
MAKER_FEE = 0.0000
SLIPPAGE = 0.0004

DEPTH_PCT = 0.0025

# === МИНИМАЛЬНЫЙ БАЛАНС ДЛЯ ТОРГОВЛИ ===
MIN_TRADE_BALANCE = 1.0

# === ГРУППЫ ===
GROUP_SAFETY = {1: 2.3, 2: 2.9, 3: 5.25, 4: 3.625, 5: 4.75, 6: 4.87}
GROUP_MIN_MULT = {1: 3.3, 2: 3.8, 3: 5.25, 4: 4.75, 5: 5.0, 6: 7.47}

GROUP_TIMEOUTS = {
    1: {'timeout': 180, 'name': 'Heavy'},
    2: {'timeout': 150, 'name': 'Mid'},
    3: {'timeout': 120, 'name': 'LowMid'},
    4: {'timeout': 90, 'name': 'Small'},
    5: {'timeout': 60, 'name': 'GOLD'},
    6: {'timeout': 45, 'name': 'Trash'}
}


# === RATE LIMITER ===
class RateLimiter:
    """Глобальный ограничитель запросов к MEXC API"""
    def __init__(self, max_per_second=1.5):
        self.min_interval = 1.0 / max_per_second
        self.last_request_time = 0
        self.lock = threading.Lock()

    def wait(self):
        with self.lock:
            now = time.time()
            elapsed = now - self.last_request_time
            if elapsed < self.min_interval:
                sleep_time = self.min_interval - elapsed
                time.sleep(sleep_time)
            self.last_request_time = time.time()


rate_limiter = RateLimiter(max_per_second=1.5)

HTTP_SESSION = requests.Session()
HTTP_SESSION.headers.update({"User-Agent": "Mozilla/5.0"})

BAN_UNTIL_TS = 0
BAN_LOCK = threading.Lock()


def set_ban_until_from_text(text):
    global BAN_UNTIL_TS
    try:
        match = re.search(r'banned until (\d{13})', text)
        if match:
            ban_ms = int(match.group(1))
            ban_ts = ban_ms / 1000.0
            with BAN_LOCK:
                BAN_UNTIL_TS = max(BAN_UNTIL_TS, ban_ts)
            wait_sec = max(1, int(ban_ts - time.time()))
            print(
                f"{Fore.RED}⛔ MEXC временно ограничил IP. "
                f"Ждем {wait_sec} сек.{Style.RESET_ALL}"
            )
            return True
    except Exception:
        pass
    return False


def get_ban_remaining():
    with BAN_LOCK:
        return max(0, int(BAN_UNTIL_TS - time.time()))


def safe_get(url, params=None, timeout=10):
    """HTTP GET с rate limiting, retry и backoff"""
    backoff = 5
    max_backoff = 120
    max_retries = 10

    for attempt in range(max_retries):
        remaining = get_ban_remaining()
        if remaining > 0:
            print(
                f"{Fore.YELLOW}⏳ Бан активен, ждем {remaining}с..."
                f"{Style.RESET_ALL}"
            )
            time.sleep(remaining + 1)
            continue

        rate_limiter.wait()

        try:
            res = HTTP_SESSION.get(url, params=params, timeout=timeout)

            if res.status_code == 200:
                return res

            if res.status_code in (418, 429):
                text = res.text
                if not set_ban_until_from_text(text):
                    print(
                        f"{Fore.RED}HTTP {res.status_code}: "
                        f"Rate Limit. Пауза {backoff}с "
                        f"(попытка {attempt + 1}/{max_retries})"
                        f"{Style.RESET_ALL}"
                    )
                    time.sleep(backoff)
                    backoff = min(backoff * 2, max_backoff)
                continue

            if res.status_code >= 500:
                print(
                    f"{Fore.RED}HTTP {res.status_code}: "
                    f"Сервер ошибка. Пауза {backoff}с{Style.RESET_ALL}"
                )
                time.sleep(backoff)
                backoff = min(backoff * 2, max_backoff)
                continue

            return res

        except requests.exceptions.Timeout:
            print(
                f"{Fore.YELLOW}⏱ Таймаут запроса, повтор через "
                f"{backoff}с...{Style.RESET_ALL}"
            )
            time.sleep(backoff)
            backoff = min(backoff * 2, max_backoff)
        except requests.RequestException as e:
            print(
                f"{Fore.RED}Сетевая ошибка: {e}. "
                f"Повтор через {backoff}с{Style.RESET_ALL}"
            )
            time.sleep(backoff)
            backoff = min(backoff * 2, max_backoff)

    print(f"{Fore.RED}❌ Все попытки исчерпаны для {url}{Style.RESET_ALL}")
    return None


class MarketManager:
    def __init__(self):
        self.symbol_map = {}
        self.symbols_list = []
        self.map_lock = threading.Lock()
        self.ticker_cache = {}
        self.ticker_cache_time = 0
        self.ticker_cache_ttl = 30

    def _get_cached_tickers(self):
        """Получает тикеры с кэшированием (один запрос для всех)"""
        now = time.time()
        if (now - self.ticker_cache_time) < self.ticker_cache_ttl and self.ticker_cache:
            return self.ticker_cache

        res = safe_get("https://api.mexc.com/api/v3/ticker/24hr", timeout=20)
        if res is None or res.status_code != 200:
            return self.ticker_cache

        try:
            tickers = res.json()
            new_cache = {}
            for t in tickers:
                sym = t.get('symbol', '')
                if sym.endswith('USDT') and sym != 'BTCUSDT':
                    quote_vol = float(t.get('quoteVolume', 0) or 0)
                    if quote_vol > 0:
                        new_cache[sym] = t
            self.ticker_cache = new_cache
            self.ticker_cache_time = now
            return new_cache
        except Exception:
            return self.ticker_cache

    def get_fresh_data(self, sym):
        """Обновляет стакан, тренд и волатильность перед входом"""
        try:
            ticker_dict = self._get_cached_tickers()
            t_data = ticker_dict.get(sym)
            if t_data is None:
                res = safe_get(
                    "https://api.mexc.com/api/v3/ticker/24hr",
                    params={'symbol': sym},
                    timeout=5
                )
                if res is None or res.status_code != 200:
                    return None
                t_data = res.json()

            high = float(t_data.get('highPrice', 0))
            low = float(t_data.get('lowPrice', 0))
            if high <= 0 or low <= 0:
                return None

            avg_price = (high + low) / 2
            price_change = float(t_data.get('priceChangePercent', 0))

            volatility = (high - low) / avg_price if avg_price > 0 else 0
            trend = 1 if price_change > 0 else -1

            d_res = safe_get(
                "https://api.mexc.com/api/v3/depth",
                params={'symbol': sym, 'limit': 100},
                timeout=5
            )
            if d_res is None or d_res.status_code != 200:
                return None
            d_data = d_res.json()

            bids = d_data.get('bids', [])
            asks = d_data.get('asks', [])
            if not bids or not asks:
                return None

            bid = float(bids[0][0])
            ask = float(asks[0][0])
            if bid <= 0 or ask <= 0:
                return None

            price = (bid + ask) / 2

            target_base = price * DEPTH_PCT
            base_asks = sum(
                float(p) * float(q)
                for p, q in asks
                if float(p) < price + target_base
            )
            base_bids = sum(
                float(p) * float(q)
                for p, q in bids
                if float(p) > price - target_base
            )
            depth_base = (base_asks + base_bids) / 2

            return {
                'volatility': volatility,
                'trend': trend,
                'depth_cost': depth_base,
                'price': price
            }
        except Exception as e:
            print(
                f"{Fore.RED}Ошибка получения свежих данных для "
                f"{sym}: {e}{Style.RESET_ALL}"
            )
            return None

    def _fetch_depth_and_calc(self, sym, ticker_data):
        """Получает depth для одного символа (с rate limiting)"""
        try:
            high = float(ticker_data.get('highPrice', 0))
            low = float(ticker_data.get('lowPrice', 0))
            if high <= 0 or low <= 0:
                return None

            avg_price = (high + low) / 2
            price_change = float(ticker_data.get('priceChangePercent', 0))

            volatility = (high - low) / avg_price if avg_price > 0 else 0
            trend = 1 if price_change > 0 else -1

            res = safe_get(
                "https://api.mexc.com/api/v3/depth",
                params={'symbol': sym, 'limit': 100},
                timeout=12
            )
            if res is None or res.status_code != 200:
                return None
            data = res.json()

            bids = data.get('bids', [])
            asks = data.get('asks', [])
            if not bids or not asks:
                return None

            bid = float(bids[0][0])
            ask = float(asks[0][0])
            price = (bid + ask) / 2
            if price <= 0:
                return None

            target_base = price * DEPTH_PCT
            base_asks = sum(
                float(p) * float(q)
                for p, q in asks
                if float(p) < price + target_base
            )
            base_bids = sum(
                float(p) * float(q)
                for p, q in bids
                if float(p) > price - target_base
            )
            depth_base = (base_asks + base_bids) / 2

            if depth_base < 500:
                return None

            move_pct = SLIPPAGE + NET_TP_PCT + TAKER_FEE + MAKER_FEE
            target_move = price * move_pct
            mv_asks = sum(
                float(p) * float(q)
                for p, q in asks
                if float(p) < price + target_move
            )
            mv_bids = sum(
                float(p) * float(q)
                for p, q in bids
                if float(p) > price - target_move
            )
            cost_move = (mv_asks + mv_bids) / 2

            raw_mult = cost_move / depth_base if depth_base > 0 else 1.0

            return {
                's': sym,
                'c': depth_base,
                'raw_mult': raw_mult,
                'volatility': volatility,
                'trend': trend
            }
        except Exception:
            return None

    def _prefilter_symbols(self, ticker_dict):
        """Предварительная фильтрация — оставляем только перспективные пары"""
        candidates = []
        for sym, t_data in ticker_dict.items():
            try:
                quote_vol = float(t_data.get('quoteVolume', 0) or 0)
                high = float(t_data.get('highPrice', 0))
                low = float(t_data.get('lowPrice', 0))

                if quote_vol < 10000:
                    continue
                if high <= 0 or low <= 0:
                    continue

                avg_price = (high + low) / 2
                if avg_price <= 0:
                    continue

                volatility = (high - low) / avg_price
                if volatility < 0.001:
                    continue

                candidates.append({
                    'symbol': sym,
                    'volume': quote_vol,
                    'volatility': volatility,
                    'ticker': t_data
                })
            except Exception:
                continue

        candidates.sort(key=lambda x: x['volume'], reverse=True)

        max_symbols = 300
        return candidates[:max_symbols]

    def scan_and_classify(self, initial=False):
        if initial:
            print(
                f"{Fore.YELLOW}🔄 Первичное сканирование "
                f"MEXC Spot...{Style.RESET_ALL}"
            )

        ticker_dict = self._get_cached_tickers()
        if not ticker_dict:
            print(
                f"{Fore.RED}Не удалось получить тикеры{Style.RESET_ALL}"
            )
            return []

        candidates = self._prefilter_symbols(ticker_dict)
        if not candidates:
            print(
                f"{Fore.RED}Нет подходящих пар после фильтрации"
                f"{Style.RESET_ALL}"
            )
            return []

        if initial:
            print(
                f"{Fore.CYAN}📊 Отфильтровано {len(candidates)} пар "
                f"из {len(ticker_dict)} для анализа depth"
                f"{Style.RESET_ALL}"
            )

        depth_data = []
        total = len(candidates)
        completed = 0
        errors = 0

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future_to_symbol = {}
            for cand in candidates:
                sym = cand['symbol']
                future = executor.submit(
                    self._fetch_depth_and_calc,
                    sym,
                    cand['ticker']
                )
                future_to_symbol[future] = sym

            for future in concurrent.futures.as_completed(future_to_symbol):
                try:
                    result = future.result()
                    if result is not None:
                        depth_data.append(result)
                    else:
                        errors += 1
                except Exception:
                    errors += 1

                completed += 1
                if initial and (completed % 10 == 0 or completed == total):
                    pct = (completed / total) * 100 if total > 0 else 0
                    print(
                        f"  Scan: {completed}/{total} ({pct:.0f}%) | "
                        f"OK: {len(depth_data)} | Skip: {errors}",
                        end="\r"
                    )

        if initial:
            print()

        if not depth_data:
            print(
                f"{Fore.RED}Нет данных после сканирования depth"
                f"{Style.RESET_ALL}"
            )
            return []

        depth_data.sort(key=lambda x: x['c'], reverse=True)
        chunk = max(1, len(depth_data) // 6)

        new_symbol_map = {}
        new_symbols_list = []

        for i in range(6):
            group_id = i + 1
            if i < 5:
                part = depth_data[i * chunk:(i + 1) * chunk]
            else:
                part = depth_data[i * chunk:]
            if not part:
                continue

            safety = GROUP_SAFETY.get(group_id, 2.5)
            min_mult = GROUP_MIN_MULT.get(group_id, 3.5)
            sett = GROUP_TIMEOUTS[group_id]

            if initial:
                avg_c = statistics.mean(x['c'] for x in part)
                avg_mult = statistics.mean(
                    max(x['raw_mult'] * safety, min_mult) for x in part
                )
                print(
                    f"  🔹 G{group_id} ({sett['name']}): "
                    f"{len(part)} пар | "
                    f"Depth ${avg_c:,.0f} | "
                    f"Avg Need: x{avg_mult:.2f} | "
                    f"T: {sett['timeout']}s"
                )

            for item in part:
                sym = item['s']
                final_mult = max(item['raw_mult'] * safety, min_mult)
                new_symbol_map[sym] = {
                    'group': group_id,
                    'depth_cost': item['c'],
                    'base_multiplier': round(final_mult, 4),
                    'timeout': sett['timeout'],
                    'group_name': sett['name'],
                    'volatility': item['volatility'],
                    'trend': item['trend']
                }
                new_symbols_list.append(sym)

        with self.map_lock:
            self.symbol_map = new_symbol_map
            self.symbols_list = new_symbols_list

        if initial:
            print(
                f"{Fore.GREEN}✅ {len(new_symbols_list)} торговых пар "
                f"загружено и классифицировано.{Style.RESET_ALL}"
            )

        return self.symbols_list

    def get_info(self, symbol):
        with self.map_lock:
            info = self.symbol_map.get(symbol)
            if info is not None:
                return copy.deepcopy(info)
            return None

    def background_scanner(self):
        while True:
            time.sleep(900)
            try:
                print(
                    f"\n{Fore.YELLOW}🔄 Фоновое пересканирование..."
                    f"{Style.RESET_ALL}"
                )
                result = self.scan_and_classify(initial=False)
                if result:
                    print(
                        f"{Fore.GREEN}✅ Пересканирование завершено: "
                        f"{len(result)} пар{Style.RESET_ALL}"
                    )
            except Exception as e:
                print(
                    f"{Fore.RED}Ошибка фонового сканирования: "
                    f"{e}{Style.RESET_ALL}"
                )


class SignalSelector:
    def __init__(self):
        self.buffer = []
        self.lock = threading.Lock()
        self.timer = None

    def add_candidate(self, signal_data, account_ref):
        with self.lock:
            self.buffer.append(signal_data)
            if self.timer is None or not self.timer.is_alive():
                self.timer = threading.Timer(
                    0.5, self._process_buffer, args=[account_ref]
                )
                self.timer.daemon = True
                self.timer.start()

    def _process_buffer(self, account_ref):
        with self.lock:
            if not self.buffer:
                return
            if account_ref.get_positions_count() >= MAX_POSITIONS:
                self.buffer.clear()
                return

            self.buffer.sort(
                key=lambda x: x['exceed_ratio'], reverse=True
            )
            best_signal = self.buffer[0]
            self.buffer.clear()

        if best_signal['exceed_ratio'] < 1.0:
            return

        sym = best_signal['sym']
        print(
            f"\n{Fore.CYAN}🔄 Обновляем данные перед входом для "
            f"{sym}...{Style.RESET_ALL}"
        )

        fresh_data = market.get_fresh_data(sym)

        if fresh_data is None:
            print(
                f"{Fore.RED}Не удалось обновить данные для {sym}, "
                f"отмена входа.{Style.RESET_ALL}"
            )
            return

        # На споте только LONG, проверяем тренд
        if fresh_data['trend'] != 1:
            print(
                f"{Fore.RED}Отмена входа {sym}: "
                f"Тренд изменился (стал нисходящим)!{Style.RESET_ALL}"
            )
            return

        # Проверяем что цена не улетела
        if fresh_data['price'] > 0 and best_signal['price'] > 0:
            price_diff_pct = abs(
                fresh_data['price'] - best_signal['price']
            ) / best_signal['price']
            if price_diff_pct > 0.005:
                print(
                    f"{Fore.RED}Отмена входа {sym}: "
                    f"Цена изменилась на "
                    f"{price_diff_pct * 100:.2f}%!{Style.RESET_ALL}"
                )
                return

        # Обновляем данные в сигнале
        best_signal['info']['volatility'] = fresh_data['volatility']
        best_signal['info']['trend'] = fresh_data['trend']
        best_signal['info']['depth_cost'] = fresh_data['depth_cost']

        account_ref.execute_trade(best_signal)


class VirtualAccount:
    def __init__(self):
        self.balance = START_BALANCE
        self.positions = {}
        self.cooldowns = {}
        self.trades_won = 0
        self.trades_lost = 0
        self.total_pnl = 0.0
        self.lock = threading.Lock()

    def get_positions_count(self):
        with self.lock:
            return len(self.positions)

    def is_cooling_down(self, sym):
        with self.lock:
            return time.time() < self.cooldowns.get(sym, 0)

    def execute_trade(self, signal):
        with self.lock:
            if len(self.positions) >= MAX_POSITIONS:
                return

            symbol = signal['sym']
            side = 'LONG'
            price = signal['price']
            info = signal['info']

            if price <= 0:
                print(
                    f"{Fore.RED}Ошибка: цена {symbol} <= 0, "
                    f"отмена входа.{Style.RESET_ALL}"
                )
                return

            if self.balance < MIN_TRADE_BALANCE:
                print(
                    f"{Fore.RED}Баланс слишком мал для торговли: "
                    f"${self.balance:.2f}{Style.RESET_ALL}"
                )
                return

            # На споте покупаем актив
            entry_price = price * (1 + SLIPPAGE)

            # Сколько USDT тратим
            trade_usdt = self.balance * TRADE_SIZE_PCT
            notional = trade_usdt * LEVERAGE

            # Комиссия за вход
            entry_fee = notional * TAKER_FEE

            # Сколько актива получаем
            usdt_after_fee = notional - entry_fee
            qty = usdt_after_fee / entry_price if entry_price > 0 else 0
            if qty <= 0:
                return

            # Списываем USDT с баланса
            self.balance -= trade_usdt

            # Адаптивные TP/SL
            vol_modifier = 1.0 + (info['volatility'] * 2.0)
            actual_tp_pct = (
                (NET_TP_PCT + TAKER_FEE + MAKER_FEE) * vol_modifier
            )
            actual_sl_pct = STOP_LOSS_PCT * vol_modifier
            actual_be_trigger_pct = BREAKEVEN_TRIGGER * vol_modifier

            tp = entry_price * (1 + actual_tp_pct)
            sl = entry_price * (1 - actual_sl_pct)

            tp_pct_val = actual_tp_pct * 100
            sl_pct_val = actual_sl_pct * 100

            self.positions[symbol] = {
                'side': side,
                'entry': entry_price,
                'qty': qty,
                'invested_usdt': trade_usdt,
                'tp': tp,
                'sl': sl,
                'start': time.time(),
                'entry_fee': entry_fee,
                'group': info['group'],
                'timeout': info['timeout'],
                'group_name': info['group_name'],
                'be_active': False,
                'be_trigger_pct': actual_be_trigger_pct,
                'tp_pct_val': tp_pct_val,
                'sl_pct_val': sl_pct_val,
                'peak_price': entry_price
            }

        msg = (
            f"🟢 OPEN LONG {symbol} "
            f"[G{info['group']} {info['group_name']}] MEXC SPOT\n"
            f"📊 Volat: {info['volatility'] * 100:.1f}%\n"
            f"Price: {entry_price:.8f}\n"
            f"Qty: {qty:.6f}\n"
            f"Invested: ${trade_usdt:.4f}\n"
            f"TP: {tp:.8f} (+{tp_pct_val:.3f}%) | "
            f"SL: {sl:.8f} (-{sl_pct_val:.3f}%)"
        )
        print(
            f"\n{Back.MAGENTA}{Fore.WHITE} 🎯 LONG {symbol} "
            f"[G{info['group']}] По Тренду! {Style.RESET_ALL}"
        )
        send_telegram(msg)

    def check_positions_loop(self):
        while True:
            time.sleep(0.1)
            with self.lock:
                now = time.time()
                active_syms = list(self.positions.keys())

                for sym in active_syms:
                    pos = self.positions.get(sym)
                    if pos is None:
                        continue

                    curr = current_prices.get(sym)
                    if curr is None or curr <= 0:
                        continue

                    # Пиковая цена
                    if curr > pos['peak_price']:
                        pos['peak_price'] = curr

                    # Текущий PnL
                    current_pnl_pct = (curr - pos['entry']) / pos['entry']

                    # Breakeven
                    if (not pos['be_active']
                            and current_pnl_pct >= pos['be_trigger_pct']):
                        pos['be_active'] = True
                        be_offset = (
                            TAKER_FEE + MAKER_FEE + SLIPPAGE + 0.0001
                        )
                        pos['sl'] = pos['entry'] * (1 + be_offset)
                        print(
                            f"\n{Fore.YELLOW}🛡 {sym} БУ Активирован! "
                            f"SL: {pos['sl']:.8f}{Style.RESET_ALL}"
                        )

                    hit_tp = (curr >= pos['tp'])
                    hit_sl = (curr <= pos['sl'])
                    is_timeout = (now - pos['start']) >= pos['timeout']

                    if hit_tp:
                        self._close(sym, pos['tp'], "TP ✅", maker=True)
                    elif hit_sl:
                        if pos['be_active']:
                            self._close(
                                sym, pos['sl'], "BE 🛡", maker=True
                            )
                        else:
                            self._close(
                                sym, pos['sl'], "SL ❌", maker=False
                            )
                    elif is_timeout:
                        exit_p = curr * (1 - SLIPPAGE)
                        if exit_p <= 0:
                            exit_p = curr
                        self._close(
                            sym, exit_p,
                            f"TIME ({pos['timeout']}s) ⏱",
                            maker=False
                        )

    def _close(self, sym, exit_price, reason, maker):
        pos = self.positions.pop(sym, None)
        if pos is None:
            return

        self.cooldowns[sym] = time.time() + COOLDOWN_AFTER_TRADE

        if exit_price <= 0:
            exit_price = pos['entry']

        # Выручка от продажи
        gross_revenue = pos['qty'] * exit_price

        # Комиссия за выход
        exit_fee = gross_revenue * (MAKER_FEE if maker else TAKER_FEE)

        # Чистая выручка
        net_revenue = gross_revenue - exit_fee

        # PnL = выручка - вложено
        trade_net_pnl = net_revenue - pos['invested_usdt']

        # Возвращаем на баланс
        self.balance += net_revenue

        self.total_pnl += trade_net_pnl

        if trade_net_pnl > 0:
            self.trades_won += 1
        else:
            self.trades_lost += 1

        total_trades = self.trades_won + self.trades_lost
        win_rate = (
            (self.trades_won / total_trades * 100)
            if total_trades > 0
            else 0.0
        )

        pnl_icon = "🟢" if trade_net_pnl > 0 else "🔴"
        total_pnl_icon = "🟢" if self.total_pnl >= 0 else "🔴"

        pnl_pct = (
            (trade_net_pnl / pos['invested_usdt'] * 100)
            if pos['invested_usdt'] > 0
            else 0
        )

        hold_time = time.time() - pos['start']
        if hold_time < 60:
            hold_str = f"{int(hold_time)}s"
        else:
            hold_str = f"{int(hold_time / 60)}m{int(hold_time % 60)}s"

        msg = (
            f"🏁 CLOSE LONG {sym} "
            f"[G{pos['group']} {pos['group_name']}]\n"
            f"Reason: {reason}\n"
            f"Entry: {pos['entry']:.8f} → Exit: {exit_price:.8f}\n"
            f"PnL: {pnl_icon} ${trade_net_pnl:.4f} ({pnl_pct:+.3f}%)\n"
            f"Total {total_pnl_icon} ${self.total_pnl:.4f}\n"
            f"Balance: ${self.balance:.4f}\n"
            f"⏱ Hold: {hold_str}\n"
            f"⚖️ W/L: {self.trades_won}/{self.trades_lost} "
            f"({win_rate:.1f}%)"
        )

        color = Fore.GREEN if trade_net_pnl > 0 else Fore.RED
        print(
            f"\n{color}🏁 CLOSE {sym}: {reason} | "
            f"PnL: {pnl_icon}${trade_net_pnl:.4f} ({pnl_pct:+.3f}%)"
            f"{Style.RESET_ALL}"
        )
        send_telegram(msg)


# === ГЛОБАЛЬНЫЕ ОБЪЕКТЫ ===
market = MarketManager()
account = VirtualAccount()
signal_manager = SignalSelector()
current_prices = {}
current_prices_lock = threading.Lock()


def process_stream(ws, message):
    try:
        data = json.loads(message)

        # Парсинг MEXC WebSocket Deals
        d_field = data.get('d')
        if d_field is None:
            return
        deals = d_field.get('deals')
        if deals is None:
            return

        # Получаем символ из канала
        channel = data.get('c', '')
        if not channel:
            return

        parts = channel.split('@')
        if len(parts) < 3:
            return

        # Исправление: символ находится в третьей части канала
        # Формат: spot@public.deals.v3.api@BTCUSDT
        sym = parts[2]

        if not deals:
            return

        for deal in deals:
            try:
                p = float(deal.get('p', 0))
                q = float(deal.get('v', 0))
                trade_side = deal.get('S', 0)
            except (ValueError, TypeError):
                continue

            if p <= 0 or q <= 0:
                continue

            # S=1 BUY taker, S=2 SELL taker
            is_sell = (trade_side == 2)

            with current_prices_lock:
                current_prices[sym] = p

            # Только BUY-сигналы (крупная покупка)
            if is_sell:
                continue

            if account.is_cooling_down(sym):
                continue

            info = market.get_info(sym)
            if info is None:
                continue

            # Входим только по тренду вверх
            if info['trend'] != 1:
                continue

            volume = p * q
            side = 'LONG'

            trend_modifier = 0.85
            vol_modifier = 1.0 + info['volatility']

            dynamic_mult = (
                info['base_multiplier'] * trend_modifier * vol_modifier
            )
            dynamic_threshold = info['depth_cost'] * dynamic_mult

            if dynamic_threshold <= 0:
                continue

            if volume >= dynamic_threshold:
                exceed_ratio = volume / dynamic_threshold
                actual_whale_mult = (
                    volume / info['depth_cost']
                    if info['depth_cost'] > 0
                    else 0
                )

                signal_data = {
                    'sym': sym,
                    'side': side,
                    'price': p,
                    'info': info,
                    'volume': volume,
                    'exceed_ratio': exceed_ratio,
                    'dyn_mult': dynamic_mult,
                    'actual_whale_mult': actual_whale_mult
                }
                signal_manager.add_candidate(signal_data, account)

    except json.JSONDecodeError:
        pass
    except Exception as e:
        print(
            f"{Fore.RED}Ошибка в process_stream: {e}{Style.RESET_ALL}"
        )


def start():
    print(f"{Fore.CYAN}{'=' * 55}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}  MEXC SPOT Whale Scalper v2.1{Style.RESET_ALL}")
    print(
        f"{Fore.CYAN}  Balance: ${START_BALANCE:.2f} | "
        f"Leverage: {LEVERAGE}x{Style.RESET_ALL}"
    )
    print(
        f"{Fore.CYAN}  TP: {NET_TP_PCT * 100:.3f}% | "
        f"SL: {STOP_LOSS_PCT * 100:.3f}%{Style.RESET_ALL}"
    )
    print(
        f"{Fore.CYAN}  BE Trigger: "
        f"{BREAKEVEN_TRIGGER * 100:.3f}%{Style.RESET_ALL}"
    )
    print(
        f"{Fore.CYAN}  Rate Limit: 1.5 req/sec | "
        f"Workers: 2{Style.RESET_ALL}"
    )
    print(f"{Fore.CYAN}{'=' * 55}{Style.RESET_ALL}")

    send_telegram(
        f"🤖 MEXC SPOT Whale Scalper v2.1 запущен\n"
        f"💰 Balance: ${START_BALANCE:.2f}\n"
        f"📊 TP: {NET_TP_PCT * 100:.3f}% | "
        f"SL: {STOP_LOSS_PCT * 100:.3f}%\n"
        f"🛡 BE Trigger: {BREAKEVEN_TRIGGER * 100:.3f}%\n"
        f"⚡ Rate Limit: 1.5 req/sec"
    )

    while True:
        symbols = market.scan_and_classify(initial=True)
        if symbols:
            break
        print(
            f"{Fore.RED}Не удалось загрузить пары, "
            f"повтор через 30с...{Style.RESET_ALL}"
        )
        time.sleep(30)

    threading.Thread(
        target=account.check_positions_loop, daemon=True
    ).start()
    threading.Thread(
        target=market.background_scanner, daemon=True
    ).start()

    print(
        f"\n{Fore.CYAN}📡 Подключение к MEXC WebSocket..."
        f"{Style.RESET_ALL}"
    )

    chunk_size = 30
    ws_connections = 0

    for i in range(0, len(symbols), chunk_size):
        chunk = symbols[i:i + chunk_size]
        ws_url = "wss://wbs.mexc.com/ws"

        def run_ws(url, syms):
            def on_open(ws):
                params = [
                    f"spot@public.deals.v3.api@{s}" for s in syms
                ]
                msg = {
                    "method": "SUBSCRIPTION",
                    "params": params
                }
                ws.send(json.dumps(msg))
                print(
                    f"{Fore.GREEN}  ✅ WS подключен: "
                    f"{len(syms)} пар{Style.RESET_ALL}"
                )

            def on_error(ws, error):
                error_str = str(error)
                if "Connection" in error_str:
                    print(
                        f"{Fore.YELLOW}⚠️ WS соединение потеряно"
                        f"{Style.RESET_ALL}"
                    )
                else:
                    print(
                        f"{Fore.RED}⚠️ WS ошибка: "
                        f"{error_str[:100]}{Style.RESET_ALL}"
                    )

            def on_close(ws, close_status_code, close_msg):
                print(
                    f"{Fore.YELLOW}🔌 WS отключен. "
                    f"Переподключение...{Style.RESET_ALL}"
                )

            reconnect_delay = 3
            max_reconnect_delay = 60

            while True:
                try:
                    ws_app = websocket.WebSocketApp(
                        url,
                        on_open=on_open,
                        on_message=process_stream,
                        on_error=on_error,
                        on_close=on_close
                    )
                    reconnect_delay = 3
                    ws_app.run_forever(
                        ping_interval=20, ping_timeout=10
                    )
                except Exception as e:
                    print(
                        f"{Fore.RED}WS исключение: {e}{Style.RESET_ALL}"
                    )

                time.sleep(reconnect_delay)
                reconnect_delay = min(
                    reconnect_delay * 1.5, max_reconnect_delay
                )

        t = threading.Thread(
            target=run_ws, args=(ws_url, chunk), daemon=True
        )
        t.start()
        ws_connections += 1
        time.sleep(0.5)

    print(
        f"{Fore.GREEN}📡 {ws_connections} WebSocket соединений "
        f"для {len(symbols)} пар{Style.RESET_ALL}"
    )
    print(
        f"{Fore.GREEN}🚀 Бот запущен и ожидает сигналы..."
        f"{Style.RESET_ALL}\n"
    )

    # Основной цикл статуса
    while True:
        time.sleep(1)
        now = time.time()

        with account.lock:
            bal = account.balance
            pnl = account.total_pnl
            won = account.trades_won
            lost = account.trades_lost
            pos_count = len(account.positions)

            unrealized = 0.0
            pos_info_str = ""
            for sym, pos in account.positions.items():
                with current_prices_lock:
                    curr_price = current_prices.get(sym)
                if curr_price and curr_price > 0:
                    curr_value = pos['qty'] * curr_price
                    invested = pos['invested_usdt']
                    unr = curr_value - invested
                    unrealized += unr
                    unr_pct = (
                        (unr / invested * 100) if invested > 0 else 0
                    )
                    be_str = "🛡" if pos['be_active'] else ""
                    hold = int(now - pos['start'])
                    pos_info_str = (
                        f" | {sym} {unr_pct:+.3f}% "
                        f"({hold}s){be_str}"
                    )

        total_equity = bal + unrealized
        total_trades = won + lost
        wr = (won / total_trades * 100) if total_trades > 0 else 0.0

        pnl_color = Fore.GREEN if pnl >= 0 else Fore.RED
        unr_color = Fore.GREEN if unrealized >= 0 else Fore.RED

        ban_remaining = get_ban_remaining()
        ban_str = (
            f" | {Fore.RED}BAN:{ban_remaining}s{Style.RESET_ALL}"
            if ban_remaining > 0
            else ""
        )

        status = (
            f"\r💰 ${bal:.4f} | "
            f"{pnl_color}PnL: ${pnl:.4f}{Style.RESET_ALL} | "
            f"{unr_color}Unr: ${unrealized:.4f}{Style.RESET_ALL} | "
            f"Eq: ${total_equity:.4f} | "
            f"W/L: {won}/{lost} ({wr:.0f}%) | "
            f"Pos: {pos_count}"
            f"{pos_info_str}{ban_str}   "
        )
        print(status, end="", flush=True)


if __name__ == "__main__":
    try:
        start()
    except KeyboardInterrupt:
        print(f"\n\n{Fore.YELLOW}⛔ Бот остановлен.{Style.RESET_ALL}")
        total_trades = account.trades_won + account.trades_lost
        wr = (
            (account.trades_won / total_trades * 100)
            if total_trades > 0
            else 0.0
        )
        final_msg = (
            f"💰 Баланс: ${account.balance:.4f} | "
            f"PnL: ${account.total_pnl:.4f} | "
            f"W/L: {account.trades_won}/{account.trades_lost} "
            f"({wr:.1f}%)"
        )
        print(final_msg)
        send_telegram(
            f"⛔ MEXC SPOT Бот остановлен\n"
            f"💰 Баланс: ${account.balance:.4f}\n"
            f"📊 PnL: ${account.total_pnl:.4f}\n"
            f"⚖️ W/L: {account.trades_won}/{account.trades_lost} "
            f"({wr:.1f}%)"
        )
        time.sleep(2)
