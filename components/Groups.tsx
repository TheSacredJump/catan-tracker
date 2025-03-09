"use client";
import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { X } from 'lucide-react';

type Player = {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
};

type Group = {
  id: number;
  name: string;
  owner_id: string | null;
  created_at?: string;
  // We'll add a players field after processing the joined data:
  players?: Player[];
};

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-neutral-700 font-bold"
        >
          X
        </button>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const Groups = () => {
  const supabase = createClientComponentClient();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [userGroups, setUserGroups] = useState<Group[]>([]);

  // Fetch groups the current user is in (as owner or member) along with joined players
  const fetchUserGroups = async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      return;
    }
    if (!sessionData.session) {
      console.error("No session found");
      return;
    }
    const userId = sessionData.session.user.id;
  
    // Query groups where the user is the owner
    const { data: ownerGroups, error: ownerError } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        owner_id,
        created_at,
        group_players (
          player_id,
          players ( id, name )
        )
      `)
      .eq('owner_id', userId);
    if (ownerError) {
      console.error("Error fetching owner groups:", JSON.stringify(ownerError));
    }
  
    // Query groups where the user is a member via the join table
    const { data: memberGroups, error: memberError } = await supabase
      .from('group_players')
      .select(`
        group_id,
        groups (
          id,
          name,
          owner_id,
          created_at,
          group_players (
            player_id,
            players ( id, name )
          )
        )
      `)
      .eq('player_id', userId);
    if (memberError) {
      console.error("Error fetching member groups:", memberError);
    }
  
    // Extract groups from memberGroups result
    const memberGroupList = memberGroups ? memberGroups.map((item: any) => item.groups) : [];
  
    // Combine and deduplicate groups
    const allGroups = ownerGroups ? [...ownerGroups, ...memberGroupList] : memberGroupList;
    const uniqueGroups = allGroups.reduce((acc: any[], group: any) => {
      if (!acc.find((g) => g.id === group.id)) {
        acc.push(group);
      }
      return acc;
    }, []);
  
    // Map each group to extract the joined players into a dedicated "players" property.
    const groupsWithPlayers = uniqueGroups.map((group: any) => {
      let playersInGroup: any[] = [];
      if (group.group_players && Array.isArray(group.group_players)) {
        // Here we assume your join relationship returns an array where each item has a "players" property.
        playersInGroup = group.group_players.map((gp: any) => gp.players);
      }
      return { ...group, players: playersInGroup };
    });
  
    setUserGroups(groupsWithPlayers);
  };
  
  

  // Fetch players with an optional search query
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

  useEffect(() => {
    fetchUserGroups();
  }, [supabase]);

  const openModal = () => {
    setIsModalOpen(true);
    fetchPlayers();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setGroupName('');
    setSearchQuery('');
    setSelectedPlayers([]);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchPlayers(query);
  };

  const handleAddPlayer = (player: Player) => {
    if (!selectedPlayers.some((p) => p.id === player.id)) {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const handleRemovePlayer = (playerId: string) => {
    setSelectedPlayers(selectedPlayers.filter((p) => p.id !== playerId));
  };

  // Create a new group and associate selected players
  const handleCreateGroup = async () => {
    if (!groupName) {
      setErrorMessage("Please enter a group name.");
      return;
    }

    // Check for duplicate group name (case-insensitive)
    if (
      userGroups.some(
        (g) => g.name.trim().toLowerCase() === groupName.trim().toLowerCase()
      )
    ) {
      setErrorMessage("You are already in a group with that name. Please choose a different name.");
      return;
    }

    // Clear any existing error message
    setErrorMessage("");

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      setErrorMessage("Error retrieving session. Please try again.");
      return;
    }
    if (!sessionData.session) {
      console.error("No session found");
      setErrorMessage("No session found. Please sign in again.");
      return;
    }
    const ownerId = sessionData.session.user.id;
    try {
      // Insert a new group record with the owner's ID
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert([{ name: groupName, owner_id: ownerId }])
        .select();
      if (groupError) {
        console.error('Error creating group:', groupError);
        setErrorMessage("Failed to create group. Please try again.");
        return;
      }
      const groupId = groupData[0].id;
      // Associate selected players with the group in the join table
      if (selectedPlayers.length > 0) {
        const groupPlayersData = selectedPlayers.map((player) => ({
          group_id: groupId,
          player_id: player.id,
        }));
        const { error: joinError } = await supabase
          .from('group_players')
          .insert(groupPlayersData);
        if (joinError) {
          console.error('Error adding players to group:', joinError);
          setErrorMessage("Group created, but failed to add some players.");
        }
      }
      // If creation was successful, clear the form and update groups
      setErrorMessage("");
      closeModal();
      fetchUserGroups(); // Refresh groups list after creation
    } catch (error) {
      console.error("Error in handleCreateGroup:", error);
      setErrorMessage("An unexpected error occurred. Please try again.");
    }
  };
  

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 zilla-slab-bold">Groups</h2>
      <button
        onClick={openModal}
        className="bg-[#b71620] text-white px-4 py-2 rounded-md hover:bg-[#a01319] transition-colors mb-6 zilla-slab-bold"
      >
        Create Group
      </button>

      {/* Display existing groups for the current user */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2 zilla-slab-bold">Your Groups</h3>
        {userGroups.length === 0 ? (
          <p className="text-neutral-500">No groups found.</p>
        ) : (
          <ul className="space-y-4">
            {userGroups.map((group) => (
              <li key={group.id} className="p-4 border rounded-md bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{group.name}</span>
                  <span className="text-sm text-neutral-500">
                    {group.created_at && new Date(group.created_at).toLocaleDateString()}
                  </span>
                </div>
                {group.players && group.players.length > 0 ? (
                  <div className="mt-2">
                    <span className="text-sm font-semibold zilla-slab-bold">Players: </span>
                    <ul className="flex flex-wrap gap-2">
                      {group.players.map((player: Player) => (
                        <li key={player.id} className="flex items-center space-x-1 border rounded p-1 bg-gray-50">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-200">
                            {player.avatar_url ? (
                              <Image
                                src={player.avatar_url}
                                alt={player.name}
                                width={24}
                                height={24}
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center text-xs text-neutral-500">
                                {player.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="text-xs">{player.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500 mt-2">No players in this group.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <h2 className="text-xl font-bold mb-4">Create a New Group</h2>
        <div className="mb-4">
          <label className="block mb-1 font-medium">Group Name</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => {
                setGroupName(e.target.value);
                // Clear error on change
                if (errorMessage) setErrorMessage('');
              }}
            className="w-full p-2 border border-neutral-300 rounded-md"
            placeholder="Enter group name"
          />
          {errorMessage && (
            <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-medium">Add Players</label>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full p-2 border border-neutral-300 rounded-md mb-2"
            placeholder="Search players by name"
          />
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b71620]"></div>
            </div>
          ) : (
            <>
              <ul className="max-h-40 overflow-y-auto border rounded-md p-2">
                {players.length === 0 ? (
                  <p className="text-neutral-500 text-sm">No players found</p>
                ) : (
                  players.map((player) => (
                    <li
                      key={player.id}
                      className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-md cursor-pointer"
                      onClick={() => handleAddPlayer(player)}
                    >
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
                      <button className="text-sm px-2 py-1 bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-700">
                        Add
                      </button>
                    </li>
                  ))
                )}
              </ul>
              {selectedPlayers.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Selected Players:</h3>
                  <ul className="border rounded-md divide-y">
                    {selectedPlayers.map((player) => (
                      <li
                        key={player.id}
                        className="flex items-center justify-between p-2"
                      >
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
                </div>
              )}
            </>
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
            onClick={handleCreateGroup}
            className="px-4 py-2 bg-[#b71620] text-white rounded-md hover:bg-[#a01319] transition-colors" 
          >
            Create Group
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Groups;
