import { useEffect, useState, useRef } from 'react';
import EditableTable from './components/EditableTable';
import InfoMessage from './components/InfoMessage';
import { remove } from "lodash";
import './App.css';

const defaultAppState = {
    rides: [
        {ride: 'Rollercoaster', time: 22},
        {ride: 'Helevator', time: 10},
        {ride: 'Flume', time: 13},
        {ride: 'Launcher', time: 25}
    ],
    workers: [
        {worker: 'Alex', canCheck: ['Rollercoaster', 'Launcher']},
        {worker: 'Kennedy', canCheck: ['Flume', 'Launcher']},
        {worker: 'Gio', canCheck: ['Rollercoaster', 'Helevator']},
        {worker: 'Alexa', canCheck: ['Flume', 'Helevator']}
    ],
    dayrestrict: [
        {
            day: 'Monday',
            time: 25,
            closedRides: ['Rollercoaster', 'Helevator'],
            absentWorkers: ['Alexa', 'Kennedy'],
        },
        {
            day: 'Tuesday',
            time: 50,
            closedRides: [],
            absentWorkers: ['Kennedy'],
        }
    ],
    // ridechecks: Not user editable. It may be out of sync with dayrestrict
    // (for example if the day name changes) until generate is hit again.
    ridechecks: [
        {
            day: 'Thursday',
            ridecheck: {
                'Rollercoaster': 'Alex',
                'Flume': 'Alexa',
                'Launcher': 'Gio',
                'Helevator': 'Kennedy'
            }
        },
        {
            day: 'Tuesday',
            ridecheck: {
                'Rollercoaster': 'Alex',
                'Flume': 'Alexa',
                'Launcher': 'Gio',
                'Helevator': 'Kennedy'
            }
        }
    ]
};

function getCsvString(headerArray, twoDimRowArray) {
    let csvString = headerArray.join(",") + "\n";
    csvString += twoDimRowArray.map(row => row.join(",")).join("\n");
    return csvString;
}

// Ridecheck generation is done for a certain day,
// and we need to filter out closedRides and absentWorkers.
function applyDayRestrict(appState, day) {
    const {time, closedRides, absentWorkers} = appState.dayrestrict.find(obj => obj.day === day);
    const problemData = {
        rides: appState.rides.filter(obj => !closedRides.includes(obj.ride)),
        workers: appState.workers.filter(obj => !absentWorkers.includes(obj.worker)) // Remove workers that are absent.
            .map(obj => ({...obj, canCheck: obj.canCheck.filter(ride => !closedRides.includes(ride))})), // Remove rides that are closed.
        total_time: time
    }
    return problemData;
}

// problemData is for one specific day, as is a ridecheck.
async function fetchRidecheck(problemData) {
    // Needed to set Access-Control-Allow-Origin to * in AWS console in order to make this work.
    const url = "https://grhg6g6d90.execute-api.us-west-2.amazonaws.com/ridecheck_generator";
    const options = {
        'method': 'POST',
        'headers': {
            'Content-Type': 'application/json',
        },
        'body': JSON.stringify(problemData)
    };
    const response = await fetch(url, options);
    const json = await response.json();
    return json;
}

async function fetchAllRidechecks(appState) {
    const days = appState.dayrestrict.map(obj => obj.day);
    const promises = days.map(day => {
        const problemData = applyDayRestrict(appState, day);
        return fetchRidecheck(problemData);
    });
    const jsonArray = await Promise.all(promises);
    console.log(jsonArray);
    const ridechecks = [];
    const couldNotGenerateDays = [];
    for (let index = 0; index < jsonArray.length; index++) {
        const json = jsonArray[index];
        if (json.success === false) {
            return {error: json.error};
        }
        const day = days[index];
        if (json.ridecheck === null) {
            couldNotGenerateDays.push(day);
        }
        ridechecks.push({day: day, ridecheck: json.ridecheck});
    }
    if (couldNotGenerateDays.length !== 0) {
        return {couldNotGenerateDays};
    } else {
        return {ridechecks};
    }
}

// findTrailingNumber("test", "test123")) === 123.
function findTrailingNumber(baseText, searchString) {
    const pattern = new RegExp(`^${baseText}(\\d+)$`);
    const match = searchString.match(pattern);
    return match ? parseInt(match[1], 10) : null;
}

// Used for auto-incrementing worker/ride/day names when "add row" button is clicked
// in the EditableTable component. E.g. "Worker1", "Worker2", "Worker3", ... ,"Worker15".
function getNextDefault(defaultBase, strings) {
    let maxNum = 0;
    for (const string of strings) {
        const stringNum = findTrailingNumber(defaultBase, string);
        console.log(stringNum);
        if (stringNum) {
            maxNum = Math.max(maxNum, stringNum);
        }
    }
    const nextDefault = `${defaultBase}${maxNum + 1}`;
    return nextDefault;
}

function App() {
    const [appState, setAppState] = useState(defaultAppState);

    // Set up an object whose .current always tracks appState (useEffect with no deps array).
    const appStateRef = useRef(appState);
    useEffect(() => {
        appStateRef.current = appState;
    });

    // https://stackoverflow.com/questions/66993812/usestate-vs-useeffect-setting-initial-value
    useEffect(() => { // useEffect runs after first render.
        async function loadAppState() {
            const defaultAppStateString = JSON.stringify(defaultAppState);
            // If there is no state to load, makes the file and stores default state.
            const {success, appStateString } = await window.appState.load(defaultAppStateString);
            if (!success) {
                console.error('cannot load application state')
            }
            setAppState(JSON.parse(appStateString));
        }

        loadAppState();

        // Define callback for appStateSaveRequest, which is fired by the
        // main process when the window 'X' button is hit.
        window.electronListener.appStateSaveRequest(async () => {
            const appStateString = JSON.stringify(appStateRef.current);
            await window.appState.store(appStateString);
            window.appState.isSaved(); // Let main process know save was completed.
        });

        // Cleanup listener.
        return () => {
            window.electronListener.appStateSaveRequest(() => {});
        }
    }, [])

    function cloneAppState() {
        return JSON.parse(JSON.stringify(appState));
    }

    function getRideRows() {
        return appState.rides.map(obj => [obj.ride, obj.time]);
    }

    function getRides() {
        return appState.rides.map(obj => obj.ride);
    }

    function getWorkers() {
        return appState.workers.map(obj => obj.worker);
    }

    // Might be out of date with dayrestrict.
    function getRidecheckDays() {
        return appState.ridechecks.map(obj => obj.day);
    }

    function getDayrestrictDays() {
        return appState.dayrestrict.map(obj => obj.day);
    }

    function setRideRows(newRows) {
        const newAppState = cloneAppState();
        const rides = [];
        // Update newAppState.rides.
        newAppState.rides = newRows.map(([ride, time]) => ({ride, time}));
        for (const [ride] of newRows) {
            rides.push(ride);
        }
        // Update newAppState.workers by removing nonexistent rides.
        for (const obj of newAppState.workers) {
            remove(obj.canCheck, ride => !rides.includes(ride));
        }
        // Update newAppState.dayrestrict.
        for (const obj of newAppState.dayrestrict) {
            remove(obj.closedRides, ride => !rides.includes(ride));
        }
        setAppState(newAppState);
    }

    // Worker rows have "worker", "checkbox1", ... "checkboxN".
    function getWorkerRows() {
        const rows = [];
        for (const {worker, canCheck} of appState.workers) {
            function workerCanCheck(ride) { return canCheck.includes(ride); }
            const row = [worker].concat(getRides().map(workerCanCheck));
            rows.push(row);
        }
        return rows;
    }

    function setWorkerRows(newRows) {
        const newAppState = cloneAppState();
        const rides = getRides();
        // Update newAppState.workers
        newAppState.workers = [];
        const workers = [];
        for (const row of newRows) {
            const [worker, ...rideBools] = row;
            workers.push(worker);
            const canCheck = [];
            // Loop through the checkboxes
            for (const [rideIdx, rideBool] of rideBools.entries()) {
                if (rideBool) {
                    canCheck.push(rides[rideIdx]);
                }
            }
            newAppState.workers.push({worker, canCheck});
        }
        // Update newAppState.dayrestrict
        for (const obj of newAppState.dayrestrict) {
            remove(obj.absentWorkers, worker => !workers.includes(worker));
        }
        setAppState(newAppState);
    }

    function getDayrestrictRows() {
        const rows = [];
        for (const obj of appState.dayrestrict) {
            const row = [
                obj.day,
                obj.time,
                {allset: getWorkers(), subset: obj.absentWorkers},
                {allset: getRides(), subset: obj.closedRides},
            ];
            rows.push(row);
        }
        return rows;
    }

    function setDayrestrictRows(newRows) {
        const newAppState = cloneAppState();
        newAppState.dayrestrict = [];
        for (const [day, time, absentWorkersObj, closedRidesObj] of newRows) {
            newAppState.dayrestrict.push({
                day,
                time,
                absentWorkers: absentWorkersObj.subset,
                closedRides: closedRidesObj.subset,
            });
        }
        setAppState(newAppState);
    }

    function getRidecheckRows() {
        const rows = [];
        const ridecheckDays = getRidecheckDays();
        for (const ride of getRides()) {
            const row = [ride];
            for (const day of ridecheckDays) {
                const obj = appState.ridechecks.find(obj => obj.day === day);
                row.push(obj.ridecheck[ride] ?? "CLOSED");
            }
            rows.push(row);
        }
        return rows;
    }
 
    function setRidechecks(newRidechecks) {
        setAppState((state) => ({...state, ridechecks: newRidechecks}));
    }

    const numRides = getRides().length;
    
    function getRidecheckHeader() {
        return ['Ride'].concat(getRidecheckDays());
    }

    const [isGenerating, setIsGenerating] = useState(false);
    const [isOpeningSaveDialog, setIsOpeningSaveDialog] = useState(false);
    const defaultDay = getNextDefault('Day', getDayrestrictDays());
    const defaultWorker = getNextDefault('Worker', getWorkers());
    const defaultRide = getNextDefault('Ride', getRides());

    // Return four EditableTable components: 
    // Ridechecks, Dayrestrict, Workers, and Rides.
    // Ridechecks is not user editable.
    return <>
        {/* RIDECHECKS TABLE */}
        <section id="ridechecks-section">
            <div className='table-header'>
                <h1 className='info-output'>Ridechecks</h1>
                <i className='info-output'> output</i>
                <InfoMessage message={"Click on the \"Regenerate\" button to regenerate the ridechecks table, taking the latest edits of the input tables into account.\n\n" + 
                    "The ridechecks table is not editable directly, rather it is generated from the input tables."}/>
            </div>
            <EditableTable
                mutableRowCount={false}
                rows={getRidecheckRows()}
                setRows={() => {}} // Will never be called.
                header={getRidecheckHeader()}
                inputTypes={Array(getRidecheckDays().length + 1).fill('na')}
                addRowText='+ Ride'
            />
            <button id="generate-button" disabled={isGenerating} onClick={async () => {
                setIsGenerating(true);
                const response = await fetchAllRidechecks(appState);
                setIsGenerating(false);
                console.log(response)
                if ('ridechecks' in response) {
                    setRidechecks(response.ridechecks);
                } else if ('couldNotGenerateDays' in response) { // One or more days was impossible to generate:
                    window.message.show(`Impossible scheduling for ${response.couldNotGenerateDays.join(", ")}`);
                } else if ('error' in response) {
                    window.message.show(`Could not generate schedule: ${response.error}. Ensure form filled correctly`);
                }
            }}>{isGenerating ? "Regenerating..." : "Regenerate"}</button>
            <button disabled={isOpeningSaveDialog} onClick={async () => {
                setIsOpeningSaveDialog(true);
                await window.ridechecksSave.ridechecksSave(getCsvString(getRidecheckHeader(), getRidecheckRows()));
                setIsOpeningSaveDialog(false);
            }}>{isOpeningSaveDialog ? "Working..." : "Save ridechecks CSV"}</button>
        </section>
        
        {/* DAYRESTRICT TABLE */}
        <section>
            <div className='table-header'>
                <h1 className='info-input'>Day restrictions</h1>
                <i className='info-input'> input</i>
                <InfoMessage message={"Determines for which days ridechecks are generated and day-specific absent workers/closed rides.\n\n" + 
                    "One of the three input tables that is used to generate the ridechecks table." 
                }/>
            </div>
            <EditableTable
                mutableRowCount={true}
                rows={getDayrestrictRows()}
                setRows={setDayrestrictRows}
                header={['Day', 'Time till open', 'Absent workers', 'Closed rides']}
                inputTypes={['text', 'number', 'subset', 'subset']}
                defaultRow={[defaultDay, 100, { allset: getWorkers(), subset: [] }, { allset: getRides(), subset: [] }]}
                forceCapitalization="titlecase"
                addRowText='+ Day'
            />
        </section>
        
        <section id="workers-section">
            <div className='table-header'>
                <h1 className='info-input'>Workers</h1>
                <i className='info-input'> input</i>
                <InfoMessage message={"Determines the workers and which rides they're trained on.\n\n" + 
                    "One of the three input tables that is used to generate the ridechecks table.\n\n" + 
                    "NOTE: Checkbox is clickable when red outline is visible. "}/>
            </div>
            {/* WORKERS TABLE*/}
            <EditableTable
                mutableRowCount={true}
                rows={getWorkerRows()}
                setRows={setWorkerRows}
                header={['Worker'].concat(getRides())}
                inputTypes={['text'].concat(Array(numRides).fill('checkbox'))}
                defaultRow={[defaultWorker].concat(Array(numRides).fill(false))}
                forceCapitalization="titlecase"
                addRowText='+ Worker'
            />
        </section>

        <section>
            <div className='table-header'>
                <h1 className='info-input'>Rides</h1>
                <i className='info-input'> input</i>
                <InfoMessage message={ "Determines the rides and how long they take to check.\n\n" + 
                    "One of the three input tables that is used to generate the ridechecks table."}/>
            </div>
            {/* RIDE TABLE */}
            <EditableTable
                mutableRowCount={true}
                rows={getRideRows()}
                setRows={setRideRows}
                header={['Ride', 'Time to check']}
                inputTypes={['text', 'number']}
                defaultRow={[defaultRide, 0]}
                forceCapitalization="titlecase"
                addRowText='+ Ride'
            />
        </section>
    </>;
}

export default App;
