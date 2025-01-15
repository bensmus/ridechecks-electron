import { useState } from "react";

function Pill({ onClick, value }) {
    const pillStyle = { border: '1px solid black', borderRadius: '10px', padding: '2px', backgroundColor: 'lightblue' };
    return <div className='pill' style={pillStyle}>
        <span style={{ fontSize: '12px' }}>{value}</span>
        <button onClick={onClick} style={{ transform: 'scale(0.75)' }}>-</button>
    </div>;
}

// allset and subset must be string arrays because <option> values are only strings.
function SubsetSelector({ allset, subset, setSubset }) {
    // Consists of:
    // 1) Dropdown and plus button which adds to subset, 
    // 2) Pills that have minus button which removes from subset.

    // Dropdown has values that aren't in subset:
    function allsetMinusSubset() {
        return allset.filter(value => !subset.includes(value));
    }

    const [toAdd, setToAdd] = useState(""); // --choose-- has value "", this is the "no selection has been made" case.

    return <div className='subset-selector' style={{ display: 'flex', gap: '7px', margin: '5px' }}>
        <div className='subset-selector-adder' style={{ padding: '2px' }}>
            {/* CONTROLLED SELECT */}
            <select value={toAdd} style={{ margin: '2px' }} onChange={(e) => setToAdd(e.target.value)}>
                <option value="">--choose--</option>
                {allsetMinusSubset().map((value, valueIdx) =>
                    <option value={value} key={valueIdx}>{value}</option>
                )}
            </select>
            {/* ADD BUTTON ADD TO SUBSET AND RESETS SELECTOR */}
            <button
                onClick={() => {
                    const newSubset = [...subset, toAdd];
                    setSubset(newSubset);
                    setToAdd("");
                }}
                disabled={toAdd === ""}
            >+</button>
        </div>
        {/* PILLS REMOVE FROM SUBSET */}
        <div className='subset-selector-pills' style={{ display: 'flex', gap: '2px' }}>
            {subset.map((value, valueIdx) =>
                <Pill
                    key={valueIdx}
                    value={value}
                    onClick={() => {
                        const newSubset = subset.filter(x => x !== value);
                        setSubset(newSubset);
                    }}
                />)}
        </div>
    </div>;
}

export default SubsetSelector;