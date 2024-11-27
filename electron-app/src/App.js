import logo from './logo.svg';
import './App.css';
import { useEffect, useState, useRef } from 'react';

const initialAppState = {
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
            absentWorkers: ['alexa'],
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

function App() {
    const [appState, setAppState] = useState('dummy state'); // Dummy state.
    const [apiResult, setApiResult] = useState('no composers'); // API not called yet.

    // Set up an object whose .current always tracks appState.
    const appStateRef = useRef(appState);
    useEffect(() => {
        appStateRef.current = appState;
    });

    // https://stackoverflow.com/questions/66993812/usestate-vs-useeffect-setting-initial-value
    useEffect(() => { // useEffect runs after first render.
        async function loadAppState() {
            const {success, appState} = await window.appState.load();
            if (!success) {
                console.error('cannot load application state')
            }
            console.log(appState);
            setAppState(appState);
        }

        loadAppState();

        // Define callback for appStateSaveRequest, which is fired by the
        // main process when the window 'X' button is hit.
        window.electronListener.appStateSaveRequest(async () => {
            await window.appState.store(appStateRef.current);
            window.appState.isSaved(); // Let main process know save was completed.
        });

        // Cleanup listener.
        return () => {
            window.electronListener.appStateSaveRequest(() => {});
        }
    }, [])

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <p>appState: {appState}</p>
        <input onChange={(e) => {setAppState(e.target.value)}}></input>
        <button onClick={(e) => {window.ridechecksSave.ridechecksSave('1 + 1 == 2')}}>
            A simple mathematical fact, saved to a location of your choosing
        </button>
        <p>apiResult: {apiResult}</p>
        <button 
            onClick={async () => {
                setApiResult('fetching composers...');
                // Needed to set Access-Control-Allow-Origin to * in AWS console in order to make this work.
                const url =  "https://grhg6g6d90.execute-api.us-west-2.amazonaws.com/ridecheck_generator";
                const problemData = applyDayRestrict(initialAppState, 'monday');
                console.log(problemData);
                try {
                    const options = {
                        'method': 'POST',
                        'headers': {
                            'Content-Type': 'application/json',
                        },
                        'body': JSON.stringify(problemData)
                    };
                    const response = await fetch(url, options);
                    const json = await response.json();
                    setApiResult(JSON.stringify(json));
                }
                catch (err) {
                    console.log(err)
                    setApiResult('Error fetching composers');
                }
            }}
        >composerButton</button>
      </header>
    </div>
  );
}

export default App;