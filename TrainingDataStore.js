import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DATASET_FILES = [
    ["entryCandles", (symbol) => `${symbol}_Entry.csv`],
    ["entryTypeCandles", (symbol) => `${symbol}_Entry_Type.csv`],
    ["exitCandles", (symbol) => `${symbol}_Exit.csv`],
];
const NSE_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

function parseCsv(text) {
    const records = [];
    let record = [];
    let value = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index++) {
        const character = text[index];

        if (inQuotes) {
            if (character === '"' && text[index + 1] === '"') {
                value += '"';
                index++;
            } else if (character === '"') {
                inQuotes = false;
            } else {
                value += character;
            }
        } else if (character === '"' && value.length === 0) {
            inQuotes = true;
        } else if (character === ",") {
            record.push(value);
            value = "";
        } else if (character === "\n") {
            record.push(value.replace(/\r$/, ""));
            if (record.some((field) => field.length > 0)) records.push(record);
            record = [];
            value = "";
        } else {
            value += character;
        }
    }

    if (inQuotes) throw new Error("Cannot update a CSV file with an unclosed quoted field.");
    if (value.length > 0 || record.length > 0) {
        record.push(value.replace(/\r$/, ""));
        if (record.some((field) => field.length > 0)) records.push(record);
    }

    return records;
}

function csvValue(value) {
    const text = value == null ? "NULL" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function tradingDate(row) {
    const value = row.date_iso ?? row.timestamp ?? row.date;
    if (!value) return null;

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return null;

    const parts = NSE_DATE_FORMATTER.formatToParts(parsedDate);
    const fields = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
    return `${fields.year}-${fields.month}-${fields.day}`;
}

async function readExistingCsv(filePath) {
    try {
        return await fs.readFile(filePath, "utf8");
    } catch (error) {
        if (error.code === "ENOENT") return "";
        throw error;
    }
}

async function prepareDataset(filePath, selectedDate, incomingRows) {
    if (!Array.isArray(incomingRows) || incomingRows.length === 0) {
        throw new Error(`Cannot save an empty dataset to ${path.basename(filePath)}.`);
    }

    const existingText = await readExistingCsv(filePath);
    const parsedRecords = existingText ? parseCsv(existingText) : [];
    const existingColumns = parsedRecords[0] ?? [];
    const incomingColumns = Object.keys(incomingRows[0]);
    const columns = [
        ...existingColumns,
        ...incomingColumns.filter((column) => !existingColumns.includes(column)),
    ];

    if (!columns.includes("label")) {
        throw new Error(`Dataset ${path.basename(filePath)} has no label column.`);
    }

    const existingRows = parsedRecords.slice(1).map((values) =>
        Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""])),
    );
    const retainedRows = existingRows.filter((row) => tradingDate(row) !== selectedDate);
    const rowValues = [...retainedRows, ...incomingRows].map((row) =>
        columns.map((column) => csvValue(row[column])).join(","),
    );

    return `${columns.map(csvValue).join(",")}\n${rowValues.join("\n")}\n`;
}

export async function saveTrainingDatasets(dataDirectory, symbol, date, datasets) {
    await fs.mkdir(dataDirectory, { recursive: true });

    const updates = await Promise.all(
        DATASET_FILES.map(async ([key, filename]) => {
            const filePath = path.join(dataDirectory, filename(symbol));
            const content = await prepareDataset(filePath, date, datasets[key]);
            return { key, filePath, content, count: datasets[key].length };
        }),
    );
    const temporaryFiles = updates.map(({ filePath }) =>
        `${filePath}.${process.pid}.${randomUUID()}.tmp`,
    );

    try {
        await Promise.all(
            updates.map(({ content }, index) =>
                fs.writeFile(temporaryFiles[index], content, "utf8"),
            ),
        );
        for (let index = 0; index < updates.length; index++) {
            await fs.rename(temporaryFiles[index], updates[index].filePath);
        }
    } catch (error) {
        await Promise.all(
            temporaryFiles.map(async (temporaryFile) => {
                try {
                    await fs.unlink(temporaryFile);
                } catch (cleanupError) {
                    if (cleanupError.code !== "ENOENT") throw cleanupError;
                }
            }),
        );
        throw error;
    }

    return Object.fromEntries(updates.map(({ key, count }) => [key, count]));
}
