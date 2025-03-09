import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { Plus, Minus, Check, X } from 'lucide-react';

// Define types for our components
type Player = {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
  games_played: number;
  win_percentage: number;
  points_per_game: number;
  roads_per_game: number;
  settlements_per_game: number;
  cities_per_game: number;
  dev_cards_per_game: number;
  largest_army_count: number;
  longest_road_count: number;
};

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

type GameStats = {
  points: number;
  roads_built: number;
  settlements_built: number;
  cities_built: number;
  dev_cards: number;
  has_largest_army: boolean;
  has_longest_road: boolean;
  is_winner: boolean;
};

// A styled modal component
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const Games: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [playerStats, setPlayerStats] = useState<Record<string, GameStats>>({});
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [games, setGames] = useState<Array<{
    id: string;
    completed_at: string;
    players: Array<{
      player_name: string;
      is_winner: boolean;
      points: number;
    }>;
  }>>([]);
  const supabase = createClientComponentClient();

  const openModal = () => {
    setIsModalOpen(true);
    fetchPlayers();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSearchQuery('');
  };

  const openStatsModal = () => {
    setIsModalOpen(false);
    setIsStatsModalOpen(true);
    setCurrentPlayerIndex(0);
  };

  const closeStatsModal = () => {
    setIsStatsModalOpen(false);
    setSelectedPlayers([]);
    setPlayerStats({});
    setGameId(null);
  };

  // Function to fetch players from Supabase using an ilike filter for searching by name
  const fetchPlayers = async (query = '') => {
    setLoading(true);
    try {
      let queryBuilder = supabase
        .from('players')
        .select('*');

      if (query) {
        queryBuilder = queryBuilder.ilike('name', `%${query}%`);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Error fetching players:', error);
      } else {
        // Fetch avatar URLs for each player
        const playersWithAvatars = await Promise.all(
          data.map(async (player) => {
            if (player.user_id) {
              const { data: userData } = await supabase
                .from('users')
                .select('avatar_url')
                .eq('id', player.user_id)
                .single();
              
              return {
                ...player,
                avatar_url: userData?.avatar_url || null
              };
            }
            return player;
          })
        );
        
        setPlayers(playersWithAvatars);
      }
    } catch (error) {
      console.error('Error in fetchPlayers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler for search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchPlayers(query);
  };

  // Add a player to the selected players list if not already added
  const handleAddPlayer = (player: Player) => {
    if (!selectedPlayers.some((p) => p.id === player.id)) {
      setSelectedPlayers([...selectedPlayers, player]);
      initializePlayerStats(player.id);
    }
  };

  // Remove a player from the selected list
  const handleRemovePlayer = (playerId: string) => {
    setSelectedPlayers(selectedPlayers.filter((p) => p.id !== playerId));
    
    // Also remove their stats
    const newPlayerStats = { ...playerStats };
    delete newPlayerStats[playerId];
    setPlayerStats(newPlayerStats);
  };

  // Add this function to initialize stats for a player
  const initializePlayerStats = (playerId: string) => {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        points: 0,
        roads_built: 0,
        settlements_built: 0,
        cities_built: 0,
        dev_cards: 0,
        has_largest_army: false,
        has_longest_road: false,
        is_winner: false,
      }
    }));
  };

  // Create game and move to stats entry
  const handleCreateGame = async () => {
    if (selectedPlayers.length === 0) {
      alert("Please select at least one player");
      return;
    }
    
    try {
      // Create a new game in the games table
      const { data, error } = await supabase
        .from('games')
        .insert({})
        .select();
      
      if (error) {
        console.error('Error creating game:', error);
        alert("Failed to create game. Please try again.");
        return;
      }
      
      // Set the game ID from the newly created game
      setGameId(data[0].id);
      openStatsModal();
    } catch (error) {
      console.error('Error in handleCreateGame:', error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  // Update stats for current player
  const updatePlayerStat = (playerId: string, field: keyof GameStats, value: any) => {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value
      }
    }));
  };

  // Handle incrementing/decrementing numeric stats
  const handleStatChange = (playerId: string, field: keyof GameStats, increment: boolean) => {
    const currentValue = playerStats[playerId][field] as number;
    updatePlayerStat(
      playerId, 
      field, 
      increment ? currentValue + 1 : Math.max(0, currentValue - 1)
    );
  };

  // Toggle boolean stats
  const handleToggleStat = (playerId: string, field: keyof GameStats) => {
    const currentValue = playerStats[playerId][field] as boolean;
    updatePlayerStat(playerId, field, !currentValue);
  };

  // Move to next player or submit if all players are done
  const handleNextPlayer = async () => {
    if (currentPlayerIndex < selectedPlayers.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
    } else {
      try {
        if (!gameId) {
          throw new Error('Game ID is missing');
        }
        
        // Create player_game_stats entries for each player
        const playerGameStats = selectedPlayers.map(player => ({
          game_id: gameId,
          player_id: player.id,
          points: playerStats[player.id].points,
          roads_built: playerStats[player.id].roads_built,
          settlements_built: playerStats[player.id].settlements_built,
          cities_built: playerStats[player.id].cities_built,
          dev_cards: playerStats[player.id].dev_cards,
          has_largest_army: playerStats[player.id].has_largest_army,
          has_longest_road: playerStats[player.id].has_longest_road,
          is_winner: playerStats[player.id].is_winner
        }));
        
        // Insert all player stats into the player_game_stats table
        const { error: statsError } = await supabase
          .from('player_game_stats')
          .insert(playerGameStats);
          
        if (statsError) {
          console.error('Error inserting player game stats:', statsError);
          throw statsError;
        }

        // Update cumulative stats for each player - using Promise.all to handle all updates concurrently
        await Promise.all(selectedPlayers.map(async (player) => {
          const stats = playerStats[player.id];
          
          // Get current player stats
          const { data: currentStats, error: fetchError } = await supabase
            .from('players')
            .select('games_played, win_percentage, points_per_game, roads_per_game, settlements_per_game, cities_per_game, dev_cards_per_game, largest_army_count, longest_road_count')
            .eq('id', player.id)
            .single();

          if (fetchError) {
            console.error('Error fetching current player stats:', fetchError);
            throw fetchError;
          }

          const newGamesPlayed = currentStats.games_played + 1;
          const newWins = currentStats.win_percentage * currentStats.games_played / 100 + (stats.is_winner ? 1 : 0);
          
          // Calculate new averages
          const updateData = {
            games_played: newGamesPlayed,
            win_percentage: (newWins / newGamesPlayed) * 100,
            points_per_game: ((currentStats.points_per_game * currentStats.games_played) + stats.points) / newGamesPlayed,
            roads_per_game: ((currentStats.roads_per_game * currentStats.games_played) + stats.roads_built) / newGamesPlayed,
            settlements_per_game: ((currentStats.settlements_per_game * currentStats.games_played) + stats.settlements_built) / newGamesPlayed,
            cities_per_game: ((currentStats.cities_per_game * currentStats.games_played) + stats.cities_built) / newGamesPlayed,
            dev_cards_per_game: ((currentStats.dev_cards_per_game * currentStats.games_played) + stats.dev_cards) / newGamesPlayed,
            largest_army_count: currentStats.largest_army_count + (stats.has_largest_army ? 1 : 0),
            longest_road_count: currentStats.longest_road_count + (stats.has_longest_road ? 1 : 0)
          };

          // Update player stats
          const { error: updateError } = await supabase
            .from('players')
            .update(updateData)
            .eq('id', player.id);

          if (updateError) {
            console.error('Error updating player stats:', updateError);
            throw updateError;
          }
        }));

        // Update the game record to mark it as completed
        const { error: gameError } = await supabase
          .from('games')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', gameId);
          
        if (gameError) {
          console.error('Error updating game completion:', gameError);
          throw gameError;
        }

        await fetchGames();

        closeStatsModal();

      } catch (error) {
        console.error('Error submitting game:', error);
        alert("Failed to submit game. Please try again.");
      }
    }
  };

  // Render the player stats form
  const renderPlayerStatsForm = () => {
    if (selectedPlayers.length === 0) return null;
    
    const currentPlayer = selectedPlayers[currentPlayerIndex];
    // Add a check to make sure currentPlayer exists and has an id
    if (!currentPlayer || !currentPlayer.id) return null;
    
    const stats = playerStats[currentPlayer.id];
    // Add a check to make sure stats exist
    if (!stats) return null;
    
    return (
      <>
        <h2 className="text-xl font-bold mb-4 zilla-slab-bold">
          Player {currentPlayerIndex + 1} of {selectedPlayers.length}: {currentPlayer.name}
        </h2>
        
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <label className="font-medium">Victory Points:</label>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleStatChange(currentPlayer.id, 'points', false)}
                className="p-1 rounded-full bg-neutral-200 hover:bg-neutral-300"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center">{stats.points}</span>
              <button 
                onClick={() => handleStatChange(currentPlayer.id, 'points', true)}
                className="p-1 rounded-full bg-neutral-200 hover:bg-neutral-300"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="font-medium">Roads Built:</label>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleStatChange(currentPlayer.id, 'roads_built', false)}
                className="p-1 rounded-full bg-neutral-200 hover:bg-neutral-300"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center">{stats.roads_built}</span>
              <button 
                onClick={() => handleStatChange(currentPlayer.id, 'roads_built', true)}
                className="p-1 rounded-full bg-neutral-200 hover:bg-neutral-300"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="font-medium">Settlements Built:</label>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleStatChange(currentPlayer.id, 'settlements_built', false)}
                className="p-1 rounded-full bg-neutral-200 hover:bg-neutral-300"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center">{stats.settlements_built}</span>
              <button 
                onClick={() => handleStatChange(currentPlayer.id, 'settlements_built', true)}
                className="p-1 rounded-full bg-neutral-200 hover:bg-neutral-300"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="font-medium">Cities Built:</label>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleStatChange(currentPlayer.id, 'cities_built', false)}
                className="p-1 rounded-full bg-neutral-200 hover:bg-neutral-300"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center">{stats.cities_built}</span>
              <button 
                onClick={() => handleStatChange(currentPlayer.id, 'cities_built', true)}
                className="p-1 rounded-full bg-neutral-200 hover:bg-neutral-300"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="font-medium">Development Cards:</label>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleStatChange(currentPlayer.id, 'dev_cards', false)}
                className="p-1 rounded-full bg-neutral-200 hover:bg-neutral-300"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center">{stats.dev_cards}</span>
              <button 
                onClick={() => handleStatChange(currentPlayer.id, 'dev_cards', true)}
                className="p-1 rounded-full bg-neutral-200 hover:bg-neutral-300"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="font-medium">Largest Army:</label>
            <button 
              onClick={() => handleToggleStat(currentPlayer.id, 'has_largest_army')}
              className={`px-3 py-1 rounded-md ${stats.has_largest_army 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-neutral-100 text-neutral-800 border border-neutral-300'}`}
            >
              {stats.has_largest_army ? 'Yes' : 'No'}
            </button>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="font-medium">Longest Road:</label>
            <button 
              onClick={() => handleToggleStat(currentPlayer.id, 'has_longest_road')}
              className={`px-3 py-1 rounded-md ${stats.has_longest_road 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-neutral-100 text-neutral-800 border border-neutral-300'}`}
            >
              {stats.has_longest_road ? 'Yes' : 'No'}
            </button>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="font-medium">Winner:</label>
            <button 
              onClick={() => handleToggleStat(currentPlayer.id, 'is_winner')}
              className={`px-3 py-1 rounded-md ${stats.is_winner 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-neutral-100 text-neutral-800 border border-neutral-300'}`}
            >
              {stats.is_winner ? 'Yes' : 'No'}
            </button>
          </div>
        </div>
        
        <div className="flex justify-between">
          <button 
            onClick={closeStatsModal}
            className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 rounded-md text-neutral-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleNextPlayer}
            className="px-4 py-2 bg-[#b71620] text-white rounded-md hover:bg-[#a01319] transition-colors flex items-center"
          >
            {currentPlayerIndex < selectedPlayers.length - 1 ? 'Next Player' : 'Submit Game'}
            <Check className="ml-1 h-4 w-4" />
          </button>
        </div>
      </>
    );
  };

  // Add useEffect to fetch games when component mounts
  useEffect(() => {
    fetchGames();
  }, []);

  // Add function to fetch games data
  const fetchGames = async () => {
    try {
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          id,
          completed_at,
          player_game_stats (
            player_id,
            points,
            is_winner,
            players (
              name
            )
          )
        `)
        .order('completed_at', { ascending: false });

      if (gamesError) throw gamesError;

      const formattedGames = gamesData.map(game => {
        const players = game.player_game_stats.map((stat: any) => ({
          player_name: stat.players.name,
          is_winner: stat.is_winner,
          points: stat.points
        }));
      
        players.sort((a, b) => (a.is_winner === b.is_winner ? 0 : a.is_winner ? -1 : 1));
      
        return {
          id: game.id,
          completed_at: game.completed_at,
          players
        };
      });
      

      setGames(formattedGames);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold zilla-slab-bold">Games</h1>
        <button 
          onClick={openModal} 
          className="bg-[#b71620] text-white px-4 py-2 rounded-md hover:bg-[#a01319] transition-colors zilla-slab-medium"
        >
          Record Game
        </button>
      </div>

      {/* Add Games List */}
      <div className="space-y-4">
        {games.map(game => (
          <div key={game.id} className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="text-sm text-neutral-500 mb-2">
              {new Date(game.completed_at).toLocaleDateString()}
            </div>
            <div className="space-y-2">
              {game.players.map((player, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    {player.is_winner && (
                      <span className="text-yellow-500 mr-2">👑</span>
                    )}
                    <span className={player.is_winner ? 'font-medium' : ''}>
                      {player.player_name}
                    </span>
                  </div>
                  <span className="text-neutral-600">{player.points} points</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Player Selection Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <h2 className="text-xl font-bold mb-4 zilla-slab-bold">Record Game</h2>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search players by name"
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full p-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b71620]"
          />
        </div>
        
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b71620]"></div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="font-medium mb-2 text-neutral-700">Available Players:</h3>
              <ul className="max-h-40 overflow-y-auto">
                {players.length === 0 ? (
                  <p className="text-neutral-500 text-sm">No players found</p>
                ) : (
                  players.map((player) => (
                    <li key={player.id} className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-md">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 mr-2">
                          {player.avatar_url ? (
                            <Image 
                              src={player.avatar_url} 
                              alt={player.name} 
                              width={32} 
                              height={32}
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-500">
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span>{player.name}</span>
                      </div>
                      <button 
                        onClick={() => handleAddPlayer(player)}
                        className="text-sm px-2 py-1 bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-700"
                      >
                        Add
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
            
            <div className="mb-6">
              <h3 className="font-medium mb-2 text-neutral-700">Selected Players:</h3>
              {selectedPlayers.length === 0 ? (
                <p className="text-neutral-500 text-sm">No players selected</p>
              ) : (
                <ul className="border rounded-md divide-y">
                  {selectedPlayers.map((player) => (
                    <li key={player.id} className="flex items-center justify-between p-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 mr-2">
                          {player.avatar_url ? (
                            <Image 
                              src={player.avatar_url} 
                              alt={player.name} 
                              width={32} 
                              height={32}
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-500">
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span>{player.name}</span>
                      </div>
                      <button 
                        onClick={() => handleRemovePlayer(player.id)}
                        className="text-sm px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="flex justify-between">
              <button 
                onClick={closeModal}
                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 rounded-md text-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateGame}
                className="px-4 py-2 bg-[#b71620] text-white rounded-md hover:bg-[#a01319] transition-colors"
                disabled={selectedPlayers.length === 0}
              >
                Next: Add Stats
              </button>
            </div>
          </>
        )}
      </Modal>
      
      {/* Player Stats Modal */}
      <Modal isOpen={isStatsModalOpen} onClose={closeStatsModal}>
        {renderPlayerStatsForm()}
      </Modal>
    </div>
  );
};

export default Games;
