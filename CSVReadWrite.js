import fs from "node:fs";
import { DEBUG_LOGS } from "./Macros.js";
import { queryObjects } from "node:v8";


class CSVReadWrite {
    constructor(filepath) {
        this.filepath = filepath;
        this.dir = filepath.slice(0, filepath.lastIndexOf("/") + 1);
        this.userID = Math.floor(Math.random() * 1e9);
    }

    printFileDetails() {
        console.log("File Stats:\n", fs.statSync(this.filepath));
        console.log("User ID:\t", this.userID);
    }

    readCSV(filePath = this.filepath) {
        const readresult = fs.readFileSync(filePath, "utf-8");
        //console.log("READ RESULT:\n", readresult);

        let ObjectArray = [];
        let columns = [];
        let rows = [];
        let prev_pointer = 0

        for (let i = 0; i < readresult.length; i++) {
            if (readresult[i] === "\n") {
                const ROW = readresult.slice(prev_pointer, i).split(",");
                rows.push(ROW);
                prev_pointer = i + 1;
                //console.log("ROW ", i, ROW);
            }
        }
        //console.log("ROWS:\n", rows);

        columns = rows[0];
        //console.log("COLUMNS:\n", columns);

        for (let i = 1; i < rows.length; i++) {
            var OBJECT = {};

            for (let j = 0; j < rows[i].length; j++) {
                OBJECT[columns[j]] = rows[i][j];
            }

            ObjectArray.push(OBJECT);
        }
        //console.log("OBJECT ARRAY:\n", ObjectArray);

        return ObjectArray;
    }

    writeCSV(object_array, file = null, write_mode = "w") {
        const dir = this.dir;
        if (file === null) {
            file = `NewFile_${Math.floor(Math.random() * 1 * 1e4)}`;
        }
        if (file.slice(file.length - 4) !== ".csv") {
            file = `${file}.csv`;
        }

        this.file = `${dir}${file}`;
        this.object_array = object_array;
        this.write_mode = write_mode;
        console.log(this.file);

        let columns = Object.keys(this.object_array[0]);
        let rows = [];
        let csvdata = "";
        // CSV Write Code Goes Here...
        if (csvdata.length <= 0) {
            csvdata = `${columns}\n`;
        }
        //console.log("CSV DATA: \n", csvdata);

        for (let i = 0; i < this.object_array.length; i++) {
            rows.push(Object.values(this.object_array[i]));
        }
        //console.log("ROWS:\n", rows);

        for (let i = 0; i < rows.length; i++) {
            if (csvdata.length >= 1) {
                csvdata += `${rows[i]}\n`;
            }
        }
        //console.log("CSV DATA FINAL:\n", csvdata);
        try {
            fs.writeFileSync(`${this.file}`, csvdata, {
                encoding: "utf-8",
                flag: this.write_mode,
                mode: 0o666
            });
            return "File Write Successful!"
        } catch (error) {
            console.log(error);
            return "Error Writing the File!\n" + error.data;
        }
    }

    appendCSV(object_array, file = null, write_mode = "w") {
        const dir = this.dir;

        const filePath = file === null ? this.filepath : `${dir}${file}`;

        try {
            // If file doesn't exist → simple write
            if (!fs.existsSync(filePath)) {
                this.write_mode = write_mode;
                return this.writeCSV(object_array, file, this.write_mode);
            }

            // Read existing data
            const existing_data = this.readCSV(filePath);

            const existing_columns = Object.keys(existing_data[0]);
            const new_columns = Object.keys(object_array[0]);

            // Schema union
            const unified_columns = [
                ...existing_columns,
                ...new_columns.filter(col => !existing_columns.includes(col))
            ];

            // Normalize rows
            const normalize = (row) => {
                const out = {};
                for (const col of unified_columns) {
                    out[col] = row[col] ?? "NULL";
                }
                return out;
            };

            const final_rows = [
                ...existing_data.map(normalize),
                ...object_array.map(normalize)
            ];

            // Build CSV string
            let csvdata = `${unified_columns.join(",")}\n`;
            for (const row of final_rows) {
                csvdata += `${unified_columns.map(c => row[c]).join(",")}\n`;
            }

            // Full rewrite (schema-safe)
            this.write_mode = write_mode;
            fs.writeFileSync(filePath, csvdata, {
                encoding: "utf-8",
                flag: this.write_mode,
                mode: 0o666
            });

            return "File Append Successful!";
        } catch (error) {
            console.error("appendCSV error:", error);
            return "Error Appending the File!";
        }
    }
}

export default CSVReadWrite;
