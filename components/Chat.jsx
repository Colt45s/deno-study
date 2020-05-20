import React from "react";

export const Chat = () => {
  const ws = React.useRef(null);
  const [inputValue, setInputValue] = React.useState("");
  const [messages, setMessages] = React.useState([]);

  const handleChange = (e) => {
    setInputValue((e.currentTarget).value);
  };

  const handleReceiveMessage = ({ data }) => {
    console.log(data);
    setMessages((m) => [...m, data]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    ws.current?.send(inputValue);
    setInputValue(inputValue);
  };

  React.useEffect(() => {
    ws.current?.close();
    ws.current = new WebSocket(`ws://127.0.0.1:3000/ws`);
    ws.current.onopen = () => console.log("ws opened");
    ws.current.onclose = () => console.log("ws closed");
    ws.current.onmessage = (e) => handleReceiveMessage(e);

    return () => {
      ws.current?.close();
    };
  }, []);

  return (
    <>
      {messages.map((message, i) => <div key={i}>{message}</div>)}
      <form onSubmit={handleSubmit}>
        <input type="text" value={inputValue} onChange={handleChange} />
        <button>Send</button>
      </form>
    </>
  );
};
