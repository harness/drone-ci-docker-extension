import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { DockerMuiThemeProvider } from '@docker/docker-mui-theme';
import { App } from './App';
import { Pipelines } from './components/Pipelines';
import { StageRunnerView } from './components/views/StageRunnerView';
import { StaticRouter } from 'react-router-dom/server';
import { HashRouter, Route, Routes } from 'react-router-dom';

const Router = (props: { children?: React.ReactNode }) => {
  const { children } = props;
  if (typeof window === 'undefined') {
    return <StaticRouter location="/">{children}</StaticRouter>;
  }
  return <HashRouter>{children}</HashRouter>;
};

ReactDOM.render(
  <>
    {/*
      If you eject from MUI (which we don't recommend!), you should add
      the `dockerDesktopTheme` class to your root <html> element to get
      some minimal Docker theming.
    */}
    <DockerMuiThemeProvider>
      <Provider store={store}>
        <Router>
          <Routes>
            <Route
              path="/*"
              element={<App />}
            >
              <Route
                index={true}
                element={<Pipelines />}
              />
            </Route>
            <Route
              path="/run"
              element={<StageRunnerView />}
            ></Route>
          </Routes>
        </Router>
      </Provider>
    </DockerMuiThemeProvider>
  </>,
  document.getElementById('root')
);
