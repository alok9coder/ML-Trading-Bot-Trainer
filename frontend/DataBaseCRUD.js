// DataBaseCRUD.mjs
import pg from "pg";
import dotenv from "dotenv";
import { DEBUG_LOGS } from "./Macros.js";

dotenv.config();

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

await db.connect();

// ─── TABLE CREATION ─────────────────────────────────────
export async function createTables() {
  try {
    await db.query(`
        CREATE TABLE IF NOT EXISTS instruments (
            id SERIAL PRIMARY KEY,
            trading_symbol VARCHAR(20) UNIQUE NOT NULL,
            instrument_token INT NOT NULL,
            exchange_token INT NOT NULL,
            exchange VARCHAR(10) NOT NULL,
            selected BOOL NOT NULL
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS simulated_orders (
            id SERIAL PRIMARY KEY,
            order_id VARCHAR(50) UNIQUE NOT NULL,
            symbol VARCHAR(20) NOT NULL,
            transaction_type VARCHAR(10) NOT NULL, -- BUY or SELL
            quantity INT NOT NULL,
            order_type VARCHAR(10) NOT NULL, -- LIMIT, MARKET, etc.
            price NUMERIC(12, 2),
            status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, FILLED, PARTIAL, CANCELLED
            timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            realized_pnl NUMERIC(12, 2) DEFAULT 0
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            order_id VARCHAR(50) UNIQUE NOT NULL,
            symbol VARCHAR(20) NOT NULL,
            transaction_type VARCHAR(10) NOT NULL,
            quantity INT NOT NULL,
            order_type VARCHAR(10) NOT NULL,
            price NUMERIC(12, 2),
            status VARCHAR(20) DEFAULT 'PENDING',
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            synced BOOLEAN DEFAULT FALSE
        );
    `);

    await db.query(`
        -- 🎯 New Flexible Thresholds Table with Test & Cash Config

        CREATE TABLE IF NOT EXISTS thresholds (
            id SERIAL PRIMARY KEY,
            trading_symbol VARCHAR(20) NOT NULL,
            use_defaults BOOLEAN DEFAULT FALSE,   -- ✅ Boolean with default false
            exchange VARCHAR(10) NOT NULL,
            thresholds JSONB NOT NULL,            -- 💾 Main thresholds config (toggles, stochRsi, etc.)
            cash_config JSONB DEFAULT '{}'::JSONB,   -- 💰 Stores allocated cash and related data
            test_config JSONB DEFAULT '{}'::JSONB,   -- 🧪 Stores testMode, testDate, etc.
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (trading_symbol, exchange)
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS trade_logs (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20) NOT NULL,
            instrument_token INT NOT NULL,
            exchange VARCHAR(10) NOT NULL,
            buy_order_id VARCHAR(50) NOT NULL,
            sell_order_id VARCHAR(50) NOT NULL,
            quantity INT NOT NULL,
            buy_price NUMERIC(10, 2) NOT NULL,
            sell_price NUMERIC(10, 2) NOT NULL,
            gross_pnl NUMERIC(10, 2) NOT NULL,
            total_charges NUMERIC(10, 2) NOT NULL,
            net_pnl NUMERIC(10, 2) NOT NULL,
            buy_time TIMESTAMP NOT NULL,
            sell_time TIMESTAMP NOT NULL,
            date DATE NOT NULL
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS ohlc_data (
            id SERIAL PRIMARY KEY,
            instrument_token BIGINT NOT NULL,
            symbol TEXT NOT NULL,
            exchange TEXT NOT NULL,
            open NUMERIC,
            high NUMERIC,
            low NUMERIC,
            close NUMERIC,
            volume INT,
            color TEXT CHECK (color IN ('GREEN', 'RED', 'DOJI')), -- restrict values,
            start_time TIMESTAMP WITHOUT TIME ZONE,
            timeframe INT NOT NULL              -- e.g., '1', '5', '30', '60'
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS order_debug_logs_json (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(100) NOT NULL,
            type VARCHAR(100), -- BUY / SELL
            quantity INT,
            price NUMERIC(10, 2),
            tema_angle NUMERIC(6, 2),
            execution_type VARCHAR(100),
            reason TEXT,

            snapshot JSONB DEFAULT '{}'::JSONB,   -- 🧪 Stores snapshot which led to that decision.

            profit_and_loss NUMERIC(10, 2),

            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS ticks (
            id SERIAL PRIMARY KEY,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            instrument_token BIGINT NOT NULL,
            tick JSON NOT NULL
        );
    `);

    console.log("✅ Tables created successfully, if didn't existed previously.");
  } catch (err) {
    console.error("❌ Error creating tables:", err);
  }
}

// ─── CRUD FUNCTIONS ─────────────────────────────────────


// ─── Instruments Table ──────────────────────────────────────────────

export async function insertInstrument(symbol, token, exToken, exchange, selected = false) {
  await db.query(
    `INSERT INTO instruments (trading_symbol, instrument_token, exchange_token, exchange, selected)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (trading_symbol) DO UPDATE SET selected = $5;`,
    [symbol, token, exToken, exchange, selected]
  );
}

export async function getSelectedInstruments() {
  const res = await db.query(`SELECT * FROM instruments WHERE selected = true`);
  return res.rows;
}

export async function updateInstrumentSelection(symbol, selected) {
  await db.query(`UPDATE instruments SET selected = $1 WHERE trading_symbol = $2`, [selected, symbol]);
}

export async function deleteInstrument(symbol) {
  await db.query(`DELETE FROM instruments WHERE trading_symbol = $1`, [symbol]);
}

// ─── Simulated Orders Table ─────────────────────────────────────────

export async function insertSimulatedOrder(order) {
    const { 
        order_id, 
        symbol, 
        transaction_type, 
        quantity, 
        order_type, 
        price, 
        status = 'COMPLETE', 
        timestamp, 
        realized_pnl = 0 
    } = order;

    await db.query(
        `INSERT INTO simulated_orders 
        (order_id, symbol, transaction_type, quantity, order_type, price, status, timestamp, realized_pnl)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (order_id) DO NOTHING;`,
        [order_id, symbol, transaction_type, quantity, order_type, price, status, timestamp, realized_pnl]
    );
}


// ─── Orders Table ───────────────────────────────────────────────────

export async function insertOrder(order) {
  const { order_id, symbol, transaction_type, quantity, order_type, price, status = 'PENDING' } = order;
  await db.query(
    `INSERT INTO orders (order_id, symbol, transaction_type, quantity, order_type, price, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (order_id) DO NOTHING;`,
    [order_id, symbol, transaction_type, quantity, order_type, price, status]
  );
}

export async function getUnsyncedOrderLogs() {
  const query = `
    SELECT order_id 
    FROM orders 
    WHERE synced = FALSE AND DATE(timestamp) = CURRENT_DATE;
  `;
  const res = await db.query(query);
  return res.rows;
}

export async function getTodaysOrders(symbol) {
  const res = await db.query(`
    SELECT * FROM orders 
    WHERE symbol = $1 AND DATE(timestamp) = CURRENT_DATE 
    ORDER BY timestamp DESC
  `, [symbol]);
  return res.rows;
}

export async function getCurrentPositionQty(symbol) {
  const res = await db.query(`
    SELECT
      SUM(CASE WHEN transaction_type = 'BUY' THEN quantity ELSE 0 END) -
      SUM(CASE WHEN transaction_type = 'SELL' THEN quantity ELSE 0 END) AS position_qty
    FROM orders
    WHERE symbol = $1 AND status = 'COMPLETE' AND DATE(timestamp) = CURRENT_DATE;
  `, [symbol]);

  return res.rows[0]?.position_qty || 0;
}

export async function markOrderAsSynced(order) {
  const {
    order_id, symbol, transaction_type, quantity,
    order_type, price, status, timestamp,
    synced = false, // default to false if not supplied
  } = order;

  await db.query(`
    UPDATE orders SET
      symbol = $1,
      transaction_type = $2,
      quantity = $3,
      order_type = $4,
      price = $5,
      status = $6,
      timestamp = $7,
      synced = $8
    WHERE order_id = $9;
  `, [
    symbol,transaction_type, quantity, order_type,
    price, status, timestamp || new Date(),
    synced,order_id
  ]);
}

export async function getOrders(symbol) {
  const res = await db.query(`SELECT * FROM orders WHERE symbol = $1 ORDER BY timestamp DESC`, [symbol]);
  return res.rows;
}

export async function updateOrderStatus(order_id, status) {
  await db.query(`UPDATE orders SET status = $1 WHERE order_id = $2`, [status, order_id]);
}

export async function deleteOrder(order_id) {
  await db.query(`DELETE FROM orders WHERE order_id = $1`, [order_id]);
}

// ─── Settings Table ─────────────────────────────────────────────────

export async function upsertThresholds(symbol, exchange = "NSE", useDefaults, thresholds, cashConfig = {}, testConfig = {}) {
    const query = `
        INSERT INTO thresholds (
            trading_symbol,
            exchange,
            use_defaults,
            thresholds,
            cash_config,
            test_config,
            updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (trading_symbol, exchange)
        DO UPDATE SET
            use_defaults = $3,
            thresholds = $4,
            cash_config = $5,
            test_config = $6,
            updated_at = NOW();
    `;

    const values = [symbol, exchange, useDefaults, thresholds, cashConfig, testConfig];
    await db.query(query, values);
}

export async function getThresholds(symbol = "DEFAULT", exchange = "NSE") {
    const res = await db.query(
        `SELECT thresholds, use_defaults, cash_config, test_config FROM thresholds WHERE trading_symbol = $1 AND exchange = $2`,
        [symbol, exchange]
    );

    if (res.rows.length === 0) return null;

    const { thresholds, use_defaults, cash_config, test_config } = res.rows[0];
    return {
        thresholds,
        cashConfig: cash_config,
        testConfig: test_config,
        useDefaults: use_defaults,
    };
}

export async function deleteThresholds(symbol, exchange = "NSE") {
    await db.query(
        `DELETE FROM thresholds WHERE trading_symbol = $1 AND exchange = $2`,
        [symbol, exchange]
    );
}

// ─── Trade Logs Table ───────────────────────────────────────────────

export async function insertTradeLog(log) {
  const {
    symbol, instrument_token, exchange,
    buy_order_id, sell_order_id, quantity,
    buy_price, sell_price, gross_pnl,
    total_charges, net_pnl, buy_time,
    sell_time, date,
  } = log;

  await db.query(`
    INSERT INTO trade_logs (
      symbol, instrument_token, exchange,
      buy_order_id, sell_order_id, quantity,
      buy_price, sell_price, gross_pnl,
      total_charges, net_pnl, buy_time, sell_time, date
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14);
  `, [
    symbol, instrument_token, exchange,
    buy_order_id, sell_order_id, quantity,
    buy_price, sell_price, gross_pnl,
    total_charges, net_pnl, buy_time,
    sell_time, date,
  ]);
}

export async function getTradeLogs(symbol) {
  const res = await db.query(`SELECT * FROM trade_logs WHERE symbol = $1 ORDER BY date DESC`, [symbol]);
  return res.rows;
}

export async function deleteTradeLog(id) {
  await db.query(`DELETE FROM trade_logs WHERE id = $1`, [id]);
}

// ─── OHLC Data Table ────────────────────────────────────────────────

export async function insertOHLC({ instrument_token, symbol, exchange, open, high, low, close, volume, color, timestamp, timeframe }) {
  try {
    //console.log(`OHLC DATA -> ${instrument_token} | ${symbol} | ${exchange} | ${open} | ${high} | ${low} | ${close} | ${volume} | ${color} | ${timestamp} | ${timeframe}`);
      const query = `
          INSERT INTO ohlc_data (
              instrument_token, symbol, exchange, open, high, low, close, volume, color, start_time, timeframe
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      const values = [instrument_token, symbol, exchange, open, high, low, close, volume, color, timestamp, timeframe];
      await db.query(query, values);
  } catch (err) {
      console.error("❌ Failed to insert OHLC data:", err.message);
  }
}

// ─── Debug Logs Table ───────────────────────────────────────────────

export async function insertOrderDebugLog(log) {
  const {
    symbol, type, quantity, price, temaAngle, execution_type, reason,
    snapshot, profit_and_loss,
  } = log;

  await db.query(`
    INSERT INTO order_debug_logs_json (
      symbol, type, quantity, price, tema_angle, execution_type, reason,
      snapshot, profit_and_loss
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9
    );
  `, [
    symbol, type, quantity, price, temaAngle, execution_type, reason,
    snapshot, profit_and_loss
  ]);
}

export async function getAllOrderDebugLogs() {
  const res = await db.query(`SELECT * FROM order_debug_logs_json ORDER BY timestamp DESC`);
  return res.rows;
}

export async function getOrderDebugLogsBySymbol(symbol) {
  const res = await db.query(
    `SELECT * FROM order_debug_logs_json WHERE symbol = $1 ORDER BY timestamp DESC`,
    [symbol]
  );
  return res.rows;
}

export async function getOrderDebugLogsByDate(symbol, fromDate, toDate) {
  const res = await db.query(
    `SELECT * FROM order_debug_logs_json 
     WHERE symbol = $1 AND timestamp BETWEEN $2 AND $3 
     ORDER BY timestamp DESC`,
    [symbol, fromDate, toDate]
  );
  return res.rows;
}

export async function deleteOrderDebugLog(id) {
  await db.query(`DELETE FROM order_debug_logs_json WHERE id = $1`, [id]);
}

export async function deleteOrderDebugLogsBySymbol(symbol) {
  await db.query(`DELETE FROM order_debug_logs_json WHERE symbol = $1`, [symbol]);
}

// ─── Ticks for Simulation ───────────────────────────────────────────────

// Insert tick data into ticks table
export async function insertTickData({ date, instrument_token, tick }) {
  const query = `
    INSERT INTO ticks (date, instrument_token, tick)
    VALUES ($1, $2, $3);
  `;
  const values = [date, instrument_token, tick];

  await db.query(query, values);
};

// Get tick data matching instrument token and date, ordered by id ascending
export async function getTickDataByTokenAndDate(instrument_token, date) {
  const query = `
    SELECT * FROM ticks
    WHERE instrument_token = $1 AND date = $2
    ORDER BY id ASC;
  `;
  const values = [instrument_token, date];

  const res = await db.query(query, values);
  return res.rows;
};

