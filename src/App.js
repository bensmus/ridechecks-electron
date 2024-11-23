import logo from './logo.svg';
import './App.css';
import { useEffect, useState, useRef } from 'react';

function App() {
    const [appState, setAppState] = useState('dummy state'); // Dummy state.

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

        // Setup listener for when electron app is about to close.
        window.electronListener.beforeQuit(() => {
            window.appState.store(appStateRef.current);
        });

        // Cleanup listener.
        return () => {
            window.electronListener.beforeQuit(() => {});
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
      </header>
    </div>
  );
}

export default App;
