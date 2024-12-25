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

// Turn header and rows into a string that can be written to a CSV file.
function getCsvString(header, rows) {
    let csvString = header.join(",") + "\n";
    csvString += rows.map(row => row.join(",")).join("\n");
    return csvString;
}

// Ridecheck generation is done for a certain day,
// and we need to filter out closedRides and absentWorkers,
// i.e. apply the day restrictions.
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

// `problemData` is for one specific day, as is a ridecheck.
// Called multiple times in fetchAllRidechecks.
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

// Returns either an error string or ridechecks, which is {day: "...", ridecheck: {...} }[].
async function fetchAllRidechecks(appState) {
    const days = appState.dayrestrict.map(obj => obj.day);
    const promises = days.map(day => {
        const problemData = applyDayRestrict(appState, day);
        return fetchRidecheck(problemData);
    });
    
    /**
     * Each promise resolves to a {status: ..., result: ...} object.
     * Status is a string that is either 
     *  'did generate' OR 
     *   one of three possible error strings.
     * Result is either 
     *   the ridechecks result OR
     *   a string that explains the error in more detail. 
     */
    const jsonArray = await Promise.all(promises);

    const ridechecks = [];
    const invalidDataErrors = [];
    const couldNotGenerateErrors = [];
    const unexpectedErrors = [];

    function getErrorString(errors) {
        let errorString = '';
        for (const {day, error} of errors) {
            errorString += `${day}: ${error}\n`;
        }
        return errorString;
    }

    for (let index = 0; index < jsonArray.length; index++) {
        const {status, result} = jsonArray[index];
        const day = days[index]
        if (status === 'did generate') {
            ridechecks.push({day, ridecheck: result})
        } else if (status === 'invalid data') {
            invalidDataErrors.push({day, error: result})
        } else if (status === 'could not generate') {
            couldNotGenerateErrors.push({day, error: result})
        } else if (status === 'unexpected error') {
            unexpectedErrors.push({day, error: result})
        } else {
            throw new Error(`api error - status ${status} is not valid - this code should never be reached`);
        }
    }

    if (ridechecks.length === days.length) { // No generation issues:
        return ridechecks;
    }

    // Priority check the arrays (unexpectedErrors -> invalidDataErrors -> couldNotGenerateErrors), and return appropriate error string.
    if (unexpectedErrors.length !== 0) {
        return "Generating ridechecks for the following days produced unexpected errors:\n" + getErrorString(unexpectedErrors);
    }
    if (invalidDataErrors.length !== 0) {
        return "Invalid data for the following days:\n" + getErrorString(invalidDataErrors);
    }
    if (couldNotGenerateErrors.length !== 0) {
        return "Could not generate ridechecks for the following days:\n" + getErrorString(couldNotGenerateErrors);
    }
    throw new Error("critical API failure - this code should never be reached");
}

// Used for auto-incrementing worker/ride/day names when "add row" button is clicked
// in the EditableTable component. E.g. "Worker1", "Worker2", "Worker3", ... ,"Worker15".
function getNextDefault(defaultBase, strings) {
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

function App() {
    const [appState, setAppState] = useState(defaultAppState);
    const [appStateLoaded, setAppStateLoaded] = useState(false);

    // Set up an object whose `current` property always tracks appState.
    const appStateRef = useRef(appState);
    useEffect(() => {
        appStateRef.current = appState;
    });

    async function saveApp() {
        const appStateString = JSON.stringify(appStateRef.current);
        const {success, error} = await window.appState.store(appStateString);
        if (!success) {
            console.log(error)
        }
    }

    useEffect(() => {
        // Don't save state on first render,
        // instead allow the app to load the state that was previously saved.
        if (appStateLoaded) {
            saveApp();
        }
        console.log("saving")
    }, [appState, appStateLoaded])

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
            setAppStateLoaded(true)
        }

        loadAppState();

        // Define callback for appStateSaveRequest, which is fired by the
        // main process when the window 'X' button is hit.
        window.electronListener.appStateSaveRequest(async () => {
            await saveApp();
            window.appState.close(); // Let main process know save was completed.
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
    const ridecheckStatusOk = 'All ridechecks generated successfully';
    const [ridecheckStatus, setRidecheckStatus] = useState(ridecheckStatusOk);
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
                if (typeof response === 'string') { // Response is an error message:
                    setRidecheckStatus(response);
                } else { // Response is ridechecks:
                    setRidechecks(response);
                    setRidecheckStatus(ridecheckStatusOk);
                }
            }}>{isGenerating ? "Regenerating..." : "Regenerate"}</button>
            <button disabled={isOpeningSaveDialog} onClick={async () => {
                setIsOpeningSaveDialog(true);
                await window.ridechecksSave.ridechecksSave(getCsvString(getRidecheckHeader(), getRidecheckRows()));
                setIsOpeningSaveDialog(false);
            }}>{isOpeningSaveDialog ? "Working..." : "Save ridechecks CSV"}</button>
            <div><span>Ridecheck status:</span><span>{ridecheckStatus === ridecheckStatusOk ? "🆗" : "❌"}</span></div>
            <div style={{'whiteSpace': 'pre-line'}}>{ridecheckStatus}</div>
        </section>
        
        {/* DAYRESTRICT TABLE */}
        <section>
            <div className='table-header'>
                <h1 className='info-input'>Day restrictions</h1>
                <InfoMessage message={"Determines for which days ridechecks are generated and day-specific absent workers/closed rides.\n\n" + 
                    "One of the three input tables that is used to generate the ridechecks table." 
                }/>
            </div>
            <EditableTable
                mutableRowCount={true}
                rows={getDayrestrictRows()}
                setRows={setDayrestrictRows}
                header={['Day', 'Time till opening (mins)', 'Absent workers', 'Closed rides']}
                inputTypes={['text', 'number', 'subset', 'subset']}
                defaultRow={[defaultDay, 100, { allset: getWorkers(), subset: [] }, { allset: getRides(), subset: [] }]}
                forceCapitalization="titlecase"
                addRowText='+ Day'
            />
        </section>
        
        <section id="workers-section">
            <div className='table-header'>
                <h1 className='info-input'>Workers</h1>
                <InfoMessage message={"Determines the workers and which rides they're trained on.\n\n" + 
                    "One of the three input tables that is used to generate the ridechecks table.\n\n" + 
                    "NOTE: Checkbox is clickable when blue outline is visible. "}/>
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
                <InfoMessage message={ "Determines the rides and how long they take to check.\n\n" + 
                    "One of the three input tables that is used to generate the ridechecks table."}/>
            </div>
            {/* RIDE TABLE */}
            <EditableTable
                mutableRowCount={true}
                rows={getRideRows()}
                setRows={setRideRows}
                header={['Ride', 'Time to check (mins)']}
                inputTypes={['text', 'number']}
                defaultRow={[defaultRide, 10]}
                forceCapitalization="titlecase"
                addRowText='+ Ride'
            />
        </section>
    </>;
}

export default App;
