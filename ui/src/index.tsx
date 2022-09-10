import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { DockerMuiThemeProvider } from '@docker/docker-mui-theme';
import { App } from './App';
import { Pipelines } from './components/Pipelines';
import { StageRunnerView } from './components/views/StageRunnerView';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

ReactDOM.render(
  <>
    {/*
      If you eject from MUI (which we don't recommend!), you should add
      the `dockerDesktopTheme` class to your root <html> element to get
      some minimal Docker theming.
    */}
    <DockerMuiThemeProvider>
      <Provider store={store}>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={<App />}
            >
              <Route
                index={true}
                element={<Pipelines />}
              />
            </Route>
            <Route
              path="run"
              element={<StageRunnerView />}
            />
          </Routes>
        </BrowserRouter>
      </Provider>
    </DockerMuiThemeProvider>
  </>,
  document.getElementById('root')
);
