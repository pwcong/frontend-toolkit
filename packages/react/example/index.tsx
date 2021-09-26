import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { buildUseList } from '../.';

const useList = buildUseList<string, any>({
  relation: ['counter'],
  getData(props, query) {
    console.log(props, query);

    return Promise.resolve({
      data: [],
      totalSize: 0,
    });
  },
});

const Cmpt = props => {
  const [{ pageNo }, { setPageNo }] = useList(props);

  return (
    <div
      style={{ background: 'red' }}
      onClick={() => setPageNo(pageNo => pageNo + 1)}
    >
      Hello World {pageNo}
    </div>
  );
};

const App = () => {
  const [counter, setCounter] = React.useState(0);

  return (
    <div className="container">
      <Cmpt counter={counter} />
      <button onClick={() => setCounter(counter + 1)}>PLUS</button>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
