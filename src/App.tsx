import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'

import Layout from 'layouts'
import Landing from 'pages/PoolList'
import CreatePool from 'pages/CreatePool'
import PoolList from 'pages/PoolList'
import Pool from 'pages/Pool';
import './App.css';
import { useState } from 'react';

const App = () => {
  const [account, setAccount] = useState<any>(null);
  return (
    <div className='App'>
      <Router>
        <Switch>
          <Layout account={account} setAccount={setAccount}>
            <Route exact path='/'>
              <CreatePool account={account} />
            </Route>
            <Route exact path='/poolList'>
              <PoolList account={account} />
            </Route>
            <Route path="/pool/:id">
              <Pool account={account} />
            </Route>
          </Layout>
        </Switch>
      </Router>
    </div>
  )
}

export default App