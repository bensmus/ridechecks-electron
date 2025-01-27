import SubsetSelector from './SubsetSelector';

function getTitleCase(str) {
    return str.replace(/\w+/, text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase())
}

function Row({ row, rowUpdate, inputTypes, forceCapitalization='none' }) {
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
                onChange={(e) => {
                    let updateWith = e.target.value;
                    switch (forceCapitalization) {
                        case 'titlecase':
                            updateWith = getTitleCase(updateWith);
                            break;
                        default:
                            break;
                    }
                    rowUpdate(updateWith, valueIdx);
                }}
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

function EditableTable({ rows, setRows, header, inputTypes, defaultRow, mutableRowCount, forceCapitalization, addRowText = 'Add row' }) {
    function rowsUpdate(targetValue, targetValueIdx, targetRowIdx) {
        setRows(rows.map(
            (row, rowIdx) => rowIdx === targetRowIdx 
            ? 
            row.map((value, valueIdx) => valueIdx === targetValueIdx ? targetValue : value) 
            : row)
        )
    }

    function rowsDelete(targetRowIdx) {
        setRows(rows.filter((_, rowIdx) => rowIdx !== targetRowIdx));
    }

    function RowRemoveButton({ rowIdx }) {
        return <td><button onClick={() => rowsDelete(rowIdx)}>-</button></td>;
    }

    function RowAddButton() {
        return <button onClick={() => setRows([...rows, defaultRow])}>{addRowText}</button>;
    }

    const headerElements = header.map((heading, headingIdx) => <th key={headingIdx}>{heading}</th>);

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
                            forceCapitalization={forceCapitalization}
                        /></tr>
                    )}
                </tbody>
            </table>
            {mutableRowCount && <RowAddButton/>}
        </>
    );
}

export default EditableTable;