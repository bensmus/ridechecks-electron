import logo from './logo.svg';
import './App.css';
import { useEffect, useState, useRef } from 'react';

function App() {
    const [appState, setAppState] = useState(null); // Dummy state.

    // Set up an object whose .current always tracks appState.
    const appStateRef = useRef(appState);
    useEffect(() => {
        appStateRef.current = appState;
    });

    // Load state.
    useEffect(() => { // useEffect is supposed to be run after the DOM is created and the render is commited, so after useState.
        async function loadAppState() {
            const {success, appState} = await window.appState.load();
            if (!success) {
                console.error('cannot load application state')
            }
            console.log(appState);
            setAppState(appState);
        }
        // Load state.
        loadAppState();
    }, [])

    // Setup listener for when electron app is about to close.
    useEffect(() => {
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
