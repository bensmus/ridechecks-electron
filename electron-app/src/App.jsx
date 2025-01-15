import { useEffect, useState } from 'react';
import { useImmerReducer } from "use-immer";

import EditableTable from './components/EditableTable';
import InfoMessage from './components/InfoMessage';

import * as select from './appstate/selectors';
import appStateReducer from './appstate/reducer';
import defaultAppState from './appstate/defaultstate';

import fetchAllRidechecks from './ridechecksApi';

import { 
    getCsvString,
    getNextDefault
} from './utils';

import './App.css';

function App() {
    const [appState, appStateDispatch] = useImmerReducer(appStateReducer, defaultAppState);
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
            const defaultAppStateString = JSON.stringify(defaultAppState);
            // If there is no state file to load from, makes the file and stores default state into it.
            const {success, appStateString } = await window.appState.load(defaultAppStateString);
            if (!success) {
                console.error('cannot load application state')
            }
            appStateDispatch({type: "set-state", payload: JSON.parse(appStateString)});
            setAppStateLoaded(true)
        }

        loadAppState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const [isGenerating, setIsGenerating] = useState(false); // Used to show in the UI that we are waiting for API response.
    const [isOpeningSaveDialog, setIsOpeningSaveDialog] = useState(false);
    const ridecheckGenSuccess = 'All ridechecks generated successfully';
    const [ridecheckGenMessage, setRidecheckGenMessage] = useState(ridecheckGenSuccess);
    
    const defaultDay = getNextDefault('Day', select.dayrestrictDays(appState));
    const defaultWorker = getNextDefault('Worker', select.workers(appState));
    const defaultRide = getNextDefault('Ride', select.rides(appState));
    
    const workers = select.workers(appState);
    const rides = select.rides(appState);
    const numRides = rides.length;
    const rideRows = select.rideRows(appState);
    const workerRows = select.workerRows(appState);
    const ridecheckRows = select.ridecheckRows(appState);
    const dayrestrictRows = select.dayrestrictRows(appState);
    const ridecheckHeader = select.ridecheckHeader(appState)
    const ridecheckDays = select.ridecheckDays(appState);

    async function handleGenerateRidechecks() {
        setIsGenerating(true);
        const response = await fetchAllRidechecks(appState);
        setIsGenerating(false);
        console.log(response)
        if (typeof response === 'string') { // Response is an error message:
            setRidecheckGenMessage(response);
        } else { // Response is ridechecks:
            appStateDispatch({type: "set-ridechecks", payload: response})
            setRidecheckGenMessage(ridecheckGenSuccess);
        }
    }

    async function handleSaveRidechecks() {
        setIsOpeningSaveDialog(true);
        await window.ridechecksSave.ridechecksSave(getCsvString(ridecheckHeader, ridecheckRows));
        setIsOpeningSaveDialog(false);
    }

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
            <button id="generate-button" disabled={isGenerating} onClick={handleGenerateRidechecks}>
                {isGenerating ? "Regenerating..." : "Regenerate"}</button>
            <button disabled={isOpeningSaveDialog} onClick={handleSaveRidechecks}>
                {isOpeningSaveDialog ? "Working..." : "Save ridechecks CSV"}</button>
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
                setRows={(newRows) => {appStateDispatch({type: 'set-dayrestrict', payload: newRows})}}
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
                setRows={(newRows) => {appStateDispatch({type: 'set-workers', payload: newRows})}}
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
                setRows={(newRows) => {appStateDispatch({type: 'set-rides', payload: newRows})}}
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
