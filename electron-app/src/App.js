import logo from './logo.svg';
import './App.css';
import { useEffect, useState, useRef } from 'react';

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
                const url = "https://api.openopus.org/composer/list/pop.json";
                try {
                    const response = await fetch(url);
                    const json = await response.json();
                    setApiResult(JSON.stringify(json));
                }
                catch (err) {
                    setApiResult('Error fetching composers');
                }
            }}
        >composerButton</button>
      </header>
    </div>
  );
}

export default App;
