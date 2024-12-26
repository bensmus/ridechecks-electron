import { useEffect, useState } from 'react';
import EditableTable from './components/EditableTable';
import InfoMessage from './components/InfoMessage';
import './App.css';
import * as asu from './appStateUtilities';

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

    // Loop through all API responses and fill the 4 arrays above.
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

    // Generation issues exist, will return error string:

    function getErrorString(errors) {
        let errorString = '';
        for (const {day, error} of errors) {
            errorString += `${day}: ${error}\n`;
        }
        return errorString;
    }

    // Check the arrays with priority "unexpectedErrors -> invalidDataErrors -> couldNotGenerateErrors", and return appropriate error string.
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
    const [appState, setAppState] = useState(asu.defaultAppState);
    const [appStateLoaded, setAppStateLoaded] = useState(false);

    // Write appState to JSON file located in userData folder (OS-dependent).
    async function saveApp(appState) {
        const appStateString = JSON.stringify(appState);
        const {success, error} = await window.appState.store(appStateString);
        if (!success) {
            console.log(error)
        }
    }

    useEffect(() => {
        // Don't save state on first render,
        // instead allow the app to load the state that was previously saved.
        if (appStateLoaded) {
            saveApp(appState);
        }
        console.log("saving")
    }, [appState, appStateLoaded])

    // https://stackoverflow.com/questions/66993812/usestate-vs-useeffect-setting-initial-value
    useEffect(() => { // useEffect runs after first render.
        async function loadAppState() {
            const defaultAppStateString = JSON.stringify(asu.defaultAppState);
            // If there is no state file to load from, makes the file and stores default state into it.
            const {success, appStateString } = await window.appState.load(defaultAppStateString);
            if (!success) {
                console.error('cannot load application state')
            }
            setAppState(JSON.parse(appStateString));
            setAppStateLoaded(true)
        }

        loadAppState();
    }, [])

    const [isGenerating, setIsGenerating] = useState(false); // Used to show in the UI that we are waiting for API response.
    const [isOpeningSaveDialog, setIsOpeningSaveDialog] = useState(false);
    const ridecheckGenSuccess = 'All ridechecks generated successfully';
    const [ridecheckGenMessage, setRidecheckGenMessage] = useState(ridecheckGenSuccess);
    
    const defaultDay = getNextDefault('Day', asu.getDayrestrictDays(appState));
    const defaultWorker = getNextDefault('Worker', asu.getWorkers(appState));
    const defaultRide = getNextDefault('Ride', asu.getRides(appState));
    
    const workers = asu.getWorkers(appState);
    const rides = asu.getRides(appState);
    const numRides = rides.length;
    const rideRows = asu.getRideRows(appState);
    const workerRows = asu.getWorkerRows(appState);
    const ridecheckRows = asu.getRidecheckRows(appState);
    const dayrestrictRows = asu.getDayrestrictRows(appState);
    const ridecheckHeader = asu.getRidecheckHeader(appState)
    const ridecheckDays = asu.getRidecheckDays(appState);

    // Return four EditableTable components: 
    // Ridechecks, Dayrestrict, Workers, and Rides.
    // Ridechecks is not user editable.
    return <>
        
        {/* RIDECHECKS SECTION */}
        <section id="ridechecks-section">
            <div className='table-header'>
                <h1 className='info-output'>Ridechecks</h1>
                <InfoMessage message={"Click on the \"Regenerate\" button to regenerate the ridechecks table, taking the latest edits of the input tables into account.\n\n" + 
                    "The ridechecks table is not editable directly, rather it is generated from the input tables."}/>
            </div>
            <EditableTable
                mutableRowCount={false}
                rows={ridecheckRows}
                setRows={() => {}} // Will never be called.
                header={ridecheckHeader}
                inputTypes={Array(ridecheckDays.length + 1).fill('na')} // na: not applicable i.e. not editable.
            />
            <button id="generate-button" disabled={isGenerating} onClick={async () => { // FIXME
                setIsGenerating(true);
                const response = await fetchAllRidechecks(appState);
                setIsGenerating(false);
                console.log(response)
                if (typeof response === 'string') { // Response is an error message:
                    setRidecheckGenMessage(response);
                } else { // Response is ridechecks:
                    asu.setRidechecks(response, setAppState);
                    setRidecheckGenMessage(ridecheckGenSuccess);
                }
            }}>{isGenerating ? "Regenerating..." : "Regenerate"}</button>
            <button disabled={isOpeningSaveDialog} onClick={async () => { // FIXME
                setIsOpeningSaveDialog(true);
                await window.ridechecksSave.ridechecksSave(getCsvString(ridecheckHeader, ridecheckRows));
                setIsOpeningSaveDialog(false);
            }}>{isOpeningSaveDialog ? "Working..." : "Save ridechecks CSV"}</button>
            <div><span>Ridecheck generation status: </span><span>{ridecheckGenMessage === ridecheckGenSuccess ? "🆗" : "❌"}</span></div>
            <div style={{'whiteSpace': 'pre-line'}}>{ridecheckGenMessage}</div>
        </section>
        
        {/* DAYRESTRICTS SECTION */}
        <section>
            <div className='table-header'>
                <h1 className='info-input'>Day restrictions</h1>
                <InfoMessage message={"Determines for which days ridechecks are generated and day-specific absent workers/closed rides.\n\n" + 
                    "One of the three input tables that is used to generate the ridechecks table." 
                }/>
            </div>
            <EditableTable
                mutableRowCount={true}
                rows={dayrestrictRows}
                setRows={(newRows) => {asu.setDayrestrictRows(newRows, setAppState)}}
                header={['Day', 'Time till opening (mins)', 'Absent workers', 'Closed rides']}
                inputTypes={['text', 'number', 'subset', 'subset']}
                defaultRow={[defaultDay, 100, { allset: workers, subset: [] }, { allset: rides, subset: [] }]}
                forceCapitalization="titlecase"
                addRowText='+ Day'
            />
        </section>
        
        {/* WORKERS SECTION*/}
        <section id="workers-section">
            <div className='table-header'>
                <h1 className='info-input'>Workers</h1>
                <InfoMessage message={"Determines the workers and which rides they're trained on.\n\n" + 
                    "One of the three input tables that is used to generate the ridechecks table.\n\n" + 
                    "NOTE: Checkbox is clickable when blue outline is visible. "}/>
            </div>
            <EditableTable
                mutableRowCount={true}
                rows={workerRows}
                setRows={(newRows) => {asu.setWorkerRows(newRows, setAppState)}}
                header={['Worker'].concat(rides)}
                inputTypes={['text'].concat(Array(numRides).fill('checkbox'))}
                defaultRow={[defaultWorker].concat(Array(numRides).fill(false))}
                forceCapitalization="titlecase"
                addRowText='+ Worker'
            />
        </section>

        {/* RIDES SECTION */}
        <section>
            <div className='table-header'>
                <h1 className='info-input'>Rides</h1>
                <InfoMessage message={ "Determines the rides and how long they take to check.\n\n" + 
                    "One of the three input tables that is used to generate the ridechecks table."}/>
            </div>
            <EditableTable
                mutableRowCount={true}
                rows={rideRows}
                setRows={(newRows) => {asu.setRideRows(newRows, setAppState)}}
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
