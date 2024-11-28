import SubsetSelector from './SubsetSelector';

function Row({ row, rowUpdate, inputTypes }) {
    function renderInput(value, valueIdx, inputType) {
        if (inputType === 'checkbox') {
            return <input
                type='checkbox'
                onChange={(e) => rowUpdate(e.target.checked, valueIdx)}
                checked={value}
            ></input>;
        }
        else if (inputType === 'subset') {
            return <SubsetSelector
                subset={value.subset}
                allset={value.allset}
                setSubset={(newSubset) => rowUpdate({ subset: newSubset, allset: value.allset }, valueIdx)}
            />;
        }
        else if (inputType === 'number') {
            return <input
                type='text'
                onChange={(e) => {
                    const targetValue = e.target.value;
                    let updateValue; // The value that gets saved to row state.
                    // Three cases: empty (show '' and set NaN), number (show it and set it), or contains letter (don't do any).
                    if (targetValue.trim() === '') {
                        updateValue = NaN;
                    } else if (!isNaN(Number(targetValue))) {
                        updateValue = Number(targetValue);
                    }
                    else {
                        return;
                    }
                    rowUpdate(updateValue, valueIdx);
                }}
                value={isNaN(value) ? '' : value}
            ></input>;
        }
        else if (inputType === 'text') {
            return <input
                type='text'
                onChange={(e) => rowUpdate(e.target.value, valueIdx)}
                value={value}
            ></input>;
        }
        else if (inputType === 'na') {
            return String(value);
        }
        else {
            throw new Error("Invalid inputType");
        }
    }
    return (
        <>
            {row.map((value, valueIdx) =>
                <td key={valueIdx}>{renderInput(value, valueIdx, inputTypes[valueIdx])}</td>
            )}
        </>
    );
}

function EditableTable({ rows, setRows, header, inputTypes, defaultRow, mutableRowCount }) {
    function cloneRows(rows) {
        return JSON.parse(JSON.stringify(rows));
    }
    function rowsUpdate(newValue, valueIdx, rowIdx) {
        const newRows = cloneRows(rows);
        newRows[rowIdx][valueIdx] = newValue;
        setRows(newRows);
    }
    function rowsDelete(targetRowIdx) {
        const newRows = cloneRows(rows).filter((_, rowIdx) => rowIdx !== targetRowIdx);
        setRows(newRows);
    }
    const headerElements = header.map((heading, headingIdx) => <th key={headingIdx}>{heading}</th>);
    function RowRemoveButton({ rowIdx }) {
        return <td><button onClick={() => rowsDelete(rowIdx)}>-</button></td>;
    }
    function RowAddButton() {
        return <button onClick={() => {
            const newRows = [...cloneRows(rows), defaultRow];
            setRows(newRows);
        }}>add row</button>
    }
    return (
        <>
            <table>
                <thead>
                    <tr>{mutableRowCount && <th></th>}{headerElements}</tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIdx) =>
                        <tr>{mutableRowCount && <RowRemoveButton rowIdx={rowIdx}/>}<Row
                            key={rowIdx}
                            row={row}
                            rowUpdate={(newValue, valueIdx) => rowsUpdate(newValue, valueIdx, rowIdx)}
                            inputTypes={inputTypes}
                        /></tr>
                    )}
                </tbody>
            </table>
            {mutableRowCount && <RowAddButton/>}
        </>
    );
}

export default EditableTable;