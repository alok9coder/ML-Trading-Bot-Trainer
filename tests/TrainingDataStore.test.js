import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { saveTrainingDatasets } from "../TrainingDataStore.js";

function makeDatasets(date, entryLabels, entryTypeLabels) {
    const makeRows = (labels) =>
        labels.map((label, index) => ({
            instrument: "ONGC",
            date: `${date}T0${index + 3}:15:00+05:30`,
            candleSequence: index + 1,
            label,
        }));

    return {
        entryCandles: makeRows(entryLabels),
        entryTypeCandles: makeRows(entryTypeLabels),
        exitCandles: makeRows([0, 0]),
    };
}

test("saves each training array separately and replaces the selected date on repeat saves", async (t) => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "zennith-training-"));
    t.after(() => fs.rm(dataDirectory, { recursive: true, force: true }));

    await saveTrainingDatasets(
        dataDirectory,
        "ONGC",
        "2026-11-18",
        makeDatasets("2026-11-18", [0, 1], [0, -1]),
    );
    await saveTrainingDatasets(
        dataDirectory,
        "ONGC",
        "2026-11-19",
        makeDatasets("2026-11-19", [1, 0], [-1, 0]),
    );
    await saveTrainingDatasets(
        dataDirectory,
        "ONGC",
        "2026-11-18",
        makeDatasets("2026-11-18", [0, 0], [0, 0]),
    );

    const entryCsv = await fs.readFile(path.join(dataDirectory, "ONGC_Entry.csv"), "utf8");
    const entryTypeCsv = await fs.readFile(
        path.join(dataDirectory, "ONGC_Entry_Type.csv"),
        "utf8",
    );
    const exitCsv = await fs.readFile(path.join(dataDirectory, "ONGC_Exit.csv"), "utf8");

    assert.equal(entryCsv.split("\n").filter((line) => line.includes("2026-11-18")).length, 2);
    assert.equal(entryCsv.split("\n").filter((line) => line.includes("2026-11-19")).length, 2);
    assert.match(entryCsv, /2026-11-19T03:15:00\+05:30,1,1/);
    assert.match(entryTypeCsv, /2026-11-19T03:15:00\+05:30,1,-1/);
    assert.match(exitCsv, /2026-11-19T03:15:00\+05:30,1,0/);
    assert.match(entryTypeCsv, /2026-11-18T04:15:00\+05:30,2,0/);
    assert.doesNotMatch(entryTypeCsv, /2026-11-18T04:15:00\+05:30,2,-1/);
});

test("replaces legacy NSE date strings in existing model CSVs", async (t) => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "zennith-legacy-"));
    t.after(() => fs.rm(dataDirectory, { recursive: true, force: true }));

    const legacyRow =
        "ONGC,Mon Dec 01 2025 09:15:00 GMT+0530 (India Standard Time),1,1\n";
    await Promise.all(
        ["ONGC_Entry.csv", "ONGC_Entry_Type.csv", "ONGC_Exit.csv"].map((filename) =>
            fs.writeFile(
                path.join(dataDirectory, filename),
                `instrument,date,candleSequence,label\n${legacyRow}`,
            ),
        ),
    );

    await saveTrainingDatasets(
        dataDirectory,
        "ONGC",
        "2025-12-01",
        makeDatasets("2025-12-01", [0, 1], [0, -1]),
    );

    const entryCsv = await fs.readFile(path.join(dataDirectory, "ONGC_Entry.csv"), "utf8");
    const entryTypeCsv = await fs.readFile(
        path.join(dataDirectory, "ONGC_Entry_Type.csv"),
        "utf8",
    );
    const exitCsv = await fs.readFile(path.join(dataDirectory, "ONGC_Exit.csv"), "utf8");

    assert.equal(entryCsv.split("\n").filter((line) => line.length > 0).length, 3);
    assert.equal(entryTypeCsv.split("\n").filter((line) => line.length > 0).length, 3);
    assert.equal(exitCsv.split("\n").filter((line) => line.length > 0).length, 3);
    assert.doesNotMatch(entryCsv, /Mon Dec 01 2025/);
    assert.match(entryTypeCsv, /2025-12-01T04:15:00\+05:30,2,-1/);
});
