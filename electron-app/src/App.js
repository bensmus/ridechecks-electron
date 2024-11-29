import { useEffect, useState, useRef } from 'react';
import EditableTable from './components/EditableTable';
import { remove } from "lodash";
import './App.css';

const defaultAppState = {
    rides: {
        rollercoaster: 22,
        helevator: 10,
        flume: 13,
        launcher: 25
    },
    workers: { // JSON's keys aren't ordered, have to store array of ride names.
        alex: ['rollercoaster', 'launcher'],
        kennedy: ['flume', 'launcher'],
        gio: ['rollercoaster', 'helevator'],
        alexa: ['flume', 'helevator']
    },
    dayrestrict: {
        monday: {
            time: 25,
            closedRides: ['rollercoaster', 'helevator'],
            absentWorkers: ['alexa', 'kennedy'],
        },
        tuesday: {
            time: 50,
            closedRides: [],
            absentWorkers: ['kennedy'],
        }
    },
    // ridechecks: Not user editable. It may be out of sync with dayrestrict
    // (for example if the day name changes) until generate is hit again.
    ridechecks: { 
        thursday: {
            'rollercoaster': 'alex',
            'flume': 'alexa',
            'launcher': 'gio',
            'helevator': 'kennedy'
        },
        tuesday: {
            'rollercoaster': 'alex',
            'flume': 'alexa',
            'launcher': 'gio',
            'helevator': 'kennedy'
        }
    }
};

function getCsvString(headerArray, twoDimRowArray) {
    let csvString = headerArray.join(",") + "\n";
    csvString += twoDimRowArray.map(row => row.join(",")).join("\n");
    return csvString;
}

// Ridecheck generation is done for a certain day,
// and we need to filter out closedRides and absentWorkers.
function applyDayRestrict(appState, day) {
    const {time, closedRides, absentWorkers} = appState['dayrestrict'][day]
    const problemData = {
        rides: Object.fromEntries(
            // [ride, time] is being filtered.
            Object.entries(appState.rides).filter(([ride, _]) => !closedRides.includes(ride))
        ),
        workers: Object.fromEntries(
            Object.entries(appState.workers)
                // [worker, workerRides] is being filtered.
                .filter(([worker, _]) => !absentWorkers.includes(worker))
                // Map workerRides such that it does not contain closed rides.
                .map(([worker, workerRides]) => ([worker, workerRides.filter(ride => !closedRides.includes(ride))]))
        ),
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
    const days = Object.keys(appState.dayrestrict)
    const promises = days.map(day => {
        const problemData = applyDayRestrict(appState, day);
        return fetchRidecheck(problemData);
    });
    const jsonArray = await Promise.all(promises);
    console.log(jsonArray);
    const ridechecks = {};
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
        ridechecks[day] = json.ridecheck;
    }
    if (couldNotGenerateDays.length !== 0) {
        return {couldNotGenerateDays};
    } else {
        return {ridechecks};
    }
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
        return Object.entries(appState.rides);
    }

    function getRides() {
        return Object.keys(appState.rides);
    }

    function getWorkers() {
        return Object.keys(appState.workers);
    }

    // Might be out of date with dayrestrict.
    function getRidecheckDays() {
        return Object.keys(appState.ridechecks);
    }

    function setRideRows(newRows) {
        const newAppState = cloneAppState();
        const rides = [];
        // Update newAppState.rides
        newAppState.rides = Object.fromEntries(newRows);
        for (const [ride] of newRows) {
            rides.push(ride);
        }
        // Update newAppState.workers
        for (const worker in newAppState.workers) {
            const workerRides = newAppState.workers[worker];
            remove(workerRides, ride => !rides.includes(ride));
        }
        // Update newAppState.dayrestrict
        for (const day in newAppState.dayrestrict) {
            const dayClosedRides = newAppState.dayrestrict[day].closedRides;
            remove(dayClosedRides, ride => !rides.includes(ride));
        }
        setAppState(newAppState);
    }

    function getWorkerRows() {
        const rows = [];
        for (const worker in appState.workers) {
            const workerRides = appState.workers[worker];
            function workerCanCheck(ride) { return workerRides.includes(ride); }
            const row = [worker].concat(getRides().map(workerCanCheck));
            rows.push(row);
        }
        return rows;
    }

    function setWorkerRows(newRows) {
        const newAppState = cloneAppState();
        const rides = getRides();
        // Update newAppState.workers
        newAppState.workers = {};
        const workers = [];
        for (const row of newRows) {
            const [worker, ...rideBools] = row;
            workers.push(worker);
            const workerRides = [];
            // Loop through the checkboxes
            for (const [rideIdx, rideBool] of rideBools.entries()) {
                if (rideBool) {
                    workerRides.push(rides[rideIdx]);
                }
            }
            newAppState.workers[worker] = workerRides;
        }
        // Update newAppState.dayrestrict
        for (const day in newAppState.dayrestrict) {
            const dayAbsentWorkers = newAppState.dayrestrict[day].absentWorkers;
            remove(dayAbsentWorkers, worker => !workers.includes(worker));
        }
        setAppState(newAppState);
    }

    function getDayrestrictRows() {
        const rows = [];
        for (const day in appState.dayrestrict) {
            const obj = appState.dayrestrict[day];
            const row = [
                day,
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
        newAppState.dayrestrict = {};
        for (const [day, time, absentWorkersObj, closedRidesObj] of newRows) {
            newAppState.dayrestrict[day] = {
                time: time,
                absentWorkers: absentWorkersObj.subset,
                closedRides: closedRidesObj.subset,
            };
        }
        setAppState(newAppState);
    }

    function getRidecheckRows() {
        const rows = [];

        const ridecheckDays = getRidecheckDays();
        for (const ride in appState.ridechecks[ridecheckDays[0]]) {
            const row = [ride];
            for (const day of ridecheckDays) {
                row.push(appState.ridechecks[day][ride]);
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
        return ['ride'].concat(getRidecheckDays());
    }

    // Return four EditableTable components: 
    // Ridechecks, Dayrestrict, Workers, and Rides.
    // Ridechecks is not user editable.
    return <>
        {/* RIDECHECKS TABLE */}
        <section>
            <h1>Ridechecks</h1>
            <EditableTable
                mutableRowCount={false}
                rows={getRidecheckRows()}
                setRows={() => {}} // Will never be called.
                header={getRidecheckHeader()}
                inputTypes={Array(getRidecheckDays().length + 1).fill('na')}
            />
            <button onClick={async () => {
                const response = await fetchAllRidechecks(appState);
                console.log(response)
                if ('ridechecks' in response) {
                    setRidechecks(response.ridechecks);
                } else if ('couldNotGenerateDays' in response) { // One or more days was impossible to generate:
                    window.message.show(`Impossible scheduling for ${JSON.stringify(response.couldNotGenerateDays)}`);
                } else if ('error' in response) {
                    window.message.show(`Could not generate schedule: ${response.error}. Ensure form filled correctly`);
                }
            }}>generate</button>
            <button onClick={() => {
                window.ridechecksSave.ridechecksSave(getCsvString(getRidecheckHeader(), getRidecheckRows()));
            }}>save ridechecks CSV</button>
        </section>
        
        {/* DAYRESTRICT TABLE */}
        <section>
            <h1>Day restrictions</h1>
            <EditableTable
                mutableRowCount={true}
                rows={getDayrestrictRows()}
                setRows={setDayrestrictRows}
                header={['day', 'time till open', 'absent workers', 'closed rides']}
                inputTypes={['text', 'number', 'subset', 'subset']}
                defaultRow={['--day--', 100, { allset: getWorkers(), subset: [] }, { allset: getRides(), subset: [] }]}
            />
        </section>
        
        <section>
            <h1>Workers</h1>
            {/* WORKERS TABLE*/}
            <EditableTable
                mutableRowCount={true}
                rows={getWorkerRows()}
                setRows={setWorkerRows}
                header={['worker'].concat(getRides())}
                inputTypes={['text'].concat(Array(numRides).fill('checkbox'))}
                defaultRow={['--worker--'].concat(Array(numRides).fill(false))}
            />
        </section>

        <section>
            <h1>Rides</h1>
            {/* RIDE TABLE */}
            <EditableTable
                mutableRowCount={true}
                rows={getRideRows()}
                setRows={setRideRows}
                header={['ride', 'time to check']}
                inputTypes={['text', 'number']}
                defaultRow={['--ride--', 0]}
            />
        </section>
    </>;
}

export default App;
