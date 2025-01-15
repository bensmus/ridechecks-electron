// Turn header and rows into a string that can be written to a CSV file.
export function getCsvString(header, rows) {
    let csvString = header.join(",") + "\n";
    csvString += rows.map(row => row.join(",")).join("\n");
    return csvString;
}

// Used for auto-incrementing worker/ride/day names when "add row" button is clicked
// in the EditableTable component. E.g. "Worker1", "Worker2", "Worker3", ... ,"Worker15".
export function getNextDefault(defaultBase, strings) {
    // findTrailingNumber("test", "test123")) === 123.
    function findTrailingNumber(baseText, searchString) {
        const pattern = new RegExp(`^${baseText}(\\d+)$`);
        const match = searchString.match(pattern);
        return match ? parseInt(match[1], 10) : null;
    }
    let maxNum = 0;
    for (const string of strings) {
        const stringNum = findTrailingNumber(defaultBase, string);
        if (stringNum) {
            maxNum = Math.max(maxNum, stringNum);
        }
    }
    const nextDefault = `${defaultBase}${maxNum + 1}`;
    return nextDefault;
}