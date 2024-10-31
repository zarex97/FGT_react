// src/App.jsx
import React, { useState } from 'react';
import TacticalGame from './components/TacticalGame';

const GameLobby = () => {
    const [username, setUsername] = useState('');
    const [roomId, setRoomId] = useState('');
    const [hasJoined, setHasJoined] = useState(false);

    const handleJoinGame = (e) => {
        e.preventDefault();
        if (username && roomId) {
            setHasJoined(true);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            {!hasJoined ? (
                <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-center mb-6">Join Tactical Game</h2>
                    <form onSubmit={handleJoinGame} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="roomId" className="block text-sm font-medium text-gray-700">
                                Room ID
                            </label>
                            <input
                                type="text"
                                id="roomId"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Join Game
                        </button>
                    </form>
                </div>
            ) : (
                <TacticalGame username={username} roomId={roomId} />
            )}
        </div>
    );
};

export default GameLobby;