import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import CssBaseline from '@mui/material/CssBaseline';
import { DockerMuiThemeProvider } from '@docker/docker-mui-theme';
import { App } from './App';
import { StageTable } from './components/StageTable';
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
                element={<StageTable />}
              />
            </Route>
            <Route
              path="run/:stageId"
              element={<StageRunnerView />}
            />
          </Routes>
        </BrowserRouter>
      </Provider>
    </DockerMuiThemeProvider>
  </>,
  document.getElementById('root')
);
