import React, { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ArrowUpDown } from 'lucide-react'

type Player = {
  id: string
  user_id: string
  name: string
  games_played: number
  win_percentage: number
  points_per_game: number
  roads_per_game: number
  settlements_per_game: number
  cities_per_game: number
  dev_cards_per_game: number
  largest_army_count: number
  longest_road_count: number
}

const Leaderboard = () => {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState('win_percentage')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('players')
          .select('id, name, games_played, win_percentage, points_per_game, roads_per_game, settlements_per_game, cities_per_game, dev_cards_per_game, largest_army_count, longest_road_count')
        
        if (error) {
          throw error
        }
        
        if (data) {
          setPlayers(data)
        }
      } catch (error) {
        console.error('Error fetching players:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [supabase])

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedPlayers = [...players].sort((a, b) => {
    const fieldA = a[sortField as keyof Player]
    const fieldB = b[sortField as keyof Player]
    
    if (sortDirection === 'asc') {
      return fieldA > fieldB ? 1 : -1
    } else {
      return fieldA < fieldB ? 1 : -1
    }
  })

  return (
    <div className="w-full p-4">
      <h2 className="text-2xl font-bold mb-6 zilla-slab-bold">Player Leaderboard</h2>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#b71620]"></div>
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-8 bg-neutral-100 rounded-lg">
          <p className="text-lg text-neutral-600">No player data available yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="bg-neutral-100 text-neutral-700">
                <th className="p-3 text-left font-semibold border-b whitespace-normal break-words">Rank</th>
                <th className="p-3 text-left font-semibold border-b whitespace-normal break-words">Player</th>
                <th 
                  className="p-3 text-left font-semibold border-b cursor-pointer"
                  onClick={() => handleSort('games_played')}
                >
                  <div className="flex items-center whitespace-normal break-words">
                    Games
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="p-3 text-left font-semibold border-b cursor-pointer"
                  onClick={() => handleSort('win_percentage')}
                >
                  <div className="flex items-center whitespace-normal break-words">
                    Win %
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="p-3 text-left font-semibold border-b cursor-pointer"
                  onClick={() => handleSort('points_per_game')}
                >
                  <div className="flex items-center whitespace-normal break-words">
                    Points Per Game
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="p-3 text-left font-semibold border-b cursor-pointer"
                  onClick={() => handleSort('roads_per_game')}
                >
                  <div className="flex items-center whitespace-normal break-words">
                    Roads Per Game
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="p-3 text-left font-semibold border-b cursor-pointer"
                  onClick={() => handleSort('settlements_per_game')}
                >
                  <div className="flex items-center whitespace-normal break-words">
                    Settlements Per Game
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="p-3 text-left font-semibold border-b cursor-pointer"
                  onClick={() => handleSort('cities_per_game')}
                >
                  <div className="flex items-center whitespace-normal break-words">
                    Cities Per Game
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="p-3 text-left font-semibold border-b cursor-pointer"
                  onClick={() => handleSort('dev_cards_per_game')}
                >
                  <div className="flex items-center whitespace-normal break-words">
                    Dev Cards Per Game
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="p-3 text-left font-semibold border-b cursor-pointer"
                  onClick={() => handleSort('largest_army_count')}
                >
                  <div className="flex items-center whitespace-normal break-words">
                    Largest Army
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="p-3 text-left font-semibold border-b cursor-pointer"
                  onClick={() => handleSort('longest_road_count')}
                >
                  <div className="flex items-center whitespace-normal break-words">
                    Longest Road
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player, index) => (
                <tr 
                  key={player.id} 
                  className={`border-b hover:bg-neutral-50 ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}
                >
                  <td className="p-3 font-medium ">{index + 1}</td>
                  <td className="p-3 font-medium overflow-hidden break-words">{player.name}</td>
                  <td className="p-3">{player.games_played}</td>
                  <td className="p-3">{(player.win_percentage).toFixed(1)}%</td>
                  <td className="p-3">{player.points_per_game.toFixed(1)}</td>
                  <td className="p-3">{player.roads_per_game.toFixed(1)}</td>
                  <td className="p-3">{player.settlements_per_game.toFixed(1)}</td>
                  <td className="p-3">{player.cities_per_game.toFixed(1)}</td>
                  <td className="p-3">{player.dev_cards_per_game.toFixed(1)}</td>
                  <td className="p-3">{player.largest_army_count}</td>
                  <td className="p-3">{player.longest_road_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Leaderboard