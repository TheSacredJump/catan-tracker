"use client";
import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Player {
  id: number;
  name: string;
  games_played: number;
  win_percentage: number;
  points_per_game: number;
  roads_per_game: number;
  settlements_per_game: number;
  cities_per_game: number;
  dev_cards_per_game: number;
  largest_army_count: number;
  longest_road_count: number;
}

const ComparePlayers = () => {
  const supabase = createClientComponentClient();

  const [searchQuery1, setSearchQuery1] = useState('');
  const [searchResults1, setSearchResults1] = useState<Player[]>([]);
  const [selectedPlayer1, setSelectedPlayer1] = useState<Player | null>(null);

  const [searchQuery2, setSearchQuery2] = useState('');
  const [searchResults2, setSearchResults2] = useState<Player[]>([]);
  const [selectedPlayer2, setSelectedPlayer2] = useState<Player | null>(null);

  const fetchPlayers = async (query: string, setResults: React.Dispatch<React.SetStateAction<Player[]>>) => {
    let queryBuilder = supabase.from('players').select('*');
    if (query) {
      queryBuilder = queryBuilder.ilike('name', `%${query}%`);
    }
    const { data, error } = await queryBuilder;
    if (error) {
      console.error('Error fetching players:', error);
    } else {
      setResults(data || []);
    }
  };

  useEffect(() => {
    fetchPlayers(searchQuery1, setSearchResults1);
  }, [searchQuery1]);

  useEffect(() => {
    fetchPlayers(searchQuery2, setSearchResults2);
  }, [searchQuery2]);

  const handleSelectPlayer1 = (player: Player) => {
    setSelectedPlayer1(player);
    setSearchQuery1(player.name);
    setSearchResults1([]);
  };

  const handleSelectPlayer2 = (player: Player) => {
    setSelectedPlayer2(player);
    setSearchQuery2(player.name);
    setSearchResults2([]);
  };

  const handleClearPlayer1 = () => {
    setSelectedPlayer1(null);
    setSearchQuery1('');
    setSearchResults1([]);
  };

  const handleClearPlayer2 = () => {
    setSelectedPlayer2(null);
    setSearchQuery2('');
    setSearchResults2([]);
  };

  // Prepare chart data if both players are selected
  const getChartData = () => {
    if (!selectedPlayer1 || !selectedPlayer2) return null;

    const labels = [
      'Win %', 
      'Points/Game', 
      'Roads/Game', 
      'Settlements/Game', 
      'Cities/Game', 
      'Dev Cards/Game', 
      'Largest Army', 
      'Longest Road'
    ];

    const player1Data = [
      selectedPlayer1.win_percentage,
      selectedPlayer1.points_per_game,
      selectedPlayer1.roads_per_game,
      selectedPlayer1.settlements_per_game,
      selectedPlayer1.cities_per_game,
      selectedPlayer1.dev_cards_per_game,
      selectedPlayer1.largest_army_count,
      selectedPlayer1.longest_road_count
    ];

    const player2Data = [
      selectedPlayer2.win_percentage,
      selectedPlayer2.points_per_game,
      selectedPlayer2.roads_per_game,
      selectedPlayer2.settlements_per_game,
      selectedPlayer2.cities_per_game,
      selectedPlayer2.dev_cards_per_game,
      selectedPlayer2.largest_army_count,
      selectedPlayer2.longest_road_count
    ];

    return {
      labels,
      datasets: [
        {
          label: selectedPlayer1.name,
          data: player1Data,
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          borderColor: 'rgba(53, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: selectedPlayer2.name,
          data: player2Data,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Player Comparison',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Compare Players</h1>
      <div className="flex flex-col md:flex-row md:space-x-8">
        <div className="flex-1 mb-6 md:mb-0">
          <h2 className="text-xl font-semibold mb-2">Player 1</h2>
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="Search for player..."
              value={searchQuery1}
              onChange={(e) => {
                setSearchQuery1(e.target.value);
                setSelectedPlayer1(null);
              }}
              className="border p-2 w-full mb-2"
            />
            {selectedPlayer1 && (
              <button
                onClick={handleClearPlayer1}
                className="px-4 py-2 bg-[#b1121c] text-white rounded hover:bg-red-600 mb-2"
              >
                Clear
              </button>
            )}
          </div>
          {searchResults1.length > 0 && !selectedPlayer1 && (
            <ul className="border p-2 max-h-60 overflow-y-auto mb-2">
              {searchResults1.map((player) => (
                <li 
                  key={player.id} 
                  onClick={() => handleSelectPlayer1(player)}
                  className="cursor-pointer hover:bg-gray-100 p-1"
                >
                  {player.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-2">Player 2</h2>
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="Search for player..."
              value={searchQuery2}
              onChange={(e) => {
                setSearchQuery2(e.target.value);
                setSelectedPlayer2(null);
              }}
              className="border p-2 w-full mb-2"
            />
            {selectedPlayer2 && (
              <button
                onClick={handleClearPlayer2}
                className="px-4 py-2 bg-[#b1121c] text-white rounded hover:bg-red-600 mb-2"
              >
                Clear
              </button>
            )}
          </div>
          {searchResults2.length > 0 && !selectedPlayer2 && (
            <ul className="border p-2 max-h-60 overflow-y-auto mb-2">
              {searchResults2.map((player) => (
                <li 
                  key={player.id} 
                  onClick={() => handleSelectPlayer2(player)}
                  className="cursor-pointer hover:bg-gray-100 p-1"
                >
                  {player.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {selectedPlayer1 && selectedPlayer2 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Comparison</h2>
          
          {/* Chart Visualization */}
          <div className="mb-8 p-4 bg-white rounded-lg shadow-md border-2 flex justify-center">
            <div className="h-96 w-full max-w-4xl">
              {getChartData() && <Bar data={getChartData()!} options={chartOptions} />}
            </div>
          </div>
          
          {/* Radar chart would be another good visualization option */}
          
          {/* Traditional table for detailed comparison */}
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Stat</th>
                <th className="p-2 border">{selectedPlayer1.name}</th>
                <th className="p-2 border">{selectedPlayer2.name}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border">Games Played</td>
                <td className="p-2 border">{selectedPlayer1.games_played}</td>
                <td className="p-2 border">{selectedPlayer2.games_played}</td>
              </tr>
              <tr>
                <td className="p-2 border">Win Percentage</td>
                <td className="p-2 border">{selectedPlayer1.win_percentage}%</td>
                <td className="p-2 border">{selectedPlayer2.win_percentage}%</td>
              </tr>
              <tr>
                <td className="p-2 border">Points per Game</td>
                <td className="p-2 border">{selectedPlayer1.points_per_game}</td>
                <td className="p-2 border">{selectedPlayer2.points_per_game}</td>
              </tr>
              <tr>
                <td className="p-2 border">Roads per Game</td>
                <td className="p-2 border">{selectedPlayer1.roads_per_game}</td>
                <td className="p-2 border">{selectedPlayer2.roads_per_game}</td>
              </tr>
              <tr>
                <td className="p-2 border">Settlements per Game</td>
                <td className="p-2 border">{selectedPlayer1.settlements_per_game}</td>
                <td className="p-2 border">{selectedPlayer2.settlements_per_game}</td>
              </tr>
              <tr>
                <td className="p-2 border">Cities per Game</td>
                <td className="p-2 border">{selectedPlayer1.cities_per_game}</td>
                <td className="p-2 border">{selectedPlayer2.cities_per_game}</td>
              </tr>
              <tr>
                <td className="p-2 border">Dev Cards per Game</td>
                <td className="p-2 border">{selectedPlayer1.dev_cards_per_game}</td>
                <td className="p-2 border">{selectedPlayer2.dev_cards_per_game}</td>
              </tr>
              <tr>
                <td className="p-2 border">Largest Army Count</td>
                <td className="p-2 border">{selectedPlayer1.largest_army_count}</td>
                <td className="p-2 border">{selectedPlayer2.largest_army_count}</td>
              </tr>
              <tr>
                <td className="p-2 border">Longest Road Count</td>
                <td className="p-2 border">{selectedPlayer1.longest_road_count}</td>
                <td className="p-2 border">{selectedPlayer2.longest_road_count}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ComparePlayers;
