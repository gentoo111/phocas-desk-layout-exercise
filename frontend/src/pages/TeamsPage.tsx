import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import {
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { useState } from 'react';
import { PUT_TEAM, TEAM_QUERY } from '../queries/teams';
import { SET_TEAM } from '../queries/people';

export default function TeamsPage() {
  const [newTeam, setNewTeam] = useState<string>('');
  const client = useApolloClient();

  const { loading, error, data } = useQuery(TEAM_QUERY);

  const [putTeam] = useMutation(PUT_TEAM, {
    update(cache, { data }, { variables }) {
      let teams = cache.readQuery({ query: TEAM_QUERY })?.teams;
      if (!data || !teams) {
        return;
      }
      if (variables?.id) {
        teams = teams.map((team) => (team.id === data.putTeam.id ? data.putTeam : team));
      } else {
        teams = [...teams, data.putTeam];
      }
      cache.writeQuery({
        query: TEAM_QUERY,
        data: { teams },
      });
    },
  });

  // Add/Remove team members mutation
  const [setTeam] = useMutation(SET_TEAM, {
    update(cache, { data }) {
      if (!data?.setTeam) return;

      // Update team query cache
      const teamsData = cache.readQuery({ query: TEAM_QUERY });
      if (teamsData?.teams) {
        const updatedTeams = teamsData.teams.map(team => ({
          ...team,
          members: team.members.filter(member => member.id !== data.setTeam.id)
        }));

        cache.writeQuery({
          query: TEAM_QUERY,
          data: { teams: updatedTeams },
        });
      }
    },
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error : {error.message}</p>;

  const handleAddTeam = async () => {
    if (newTeam.trim()) {
      await putTeam({ variables: { name: newTeam } });
      setNewTeam('');
    }
  };

  const handleDeleteTeam = async (_teamId: string) => {
    // TODO: Implement team deletion functionality (optional task)
    console.log('Delete team functionality to be implemented');
  };

  // Fix: use Apollo Client's cache.modify to correctly update the cache
  const handleEditTeamChange = (teamId: string, name: string) => {
    const teams = data?.teams;
    if (!teams) {
      return;
    }

    const team = teams.find(t => t.id === teamId);
    if (team) {
      client.cache.modify({
        id: client.cache.identify(team),
        fields: {
          name: () => name,
        },
      });
    }
  };

  const handleSaveEdit = async (teamId: string) => {
    const team = data?.teams.find((team) => team.id === teamId);
    if (team) {
      await putTeam({ variables: { id: teamId, name: team.name } });
    }
  };

  // New: remove member from team functionality
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (confirm(`Are you sure you want to remove ${memberName} from the team? This will set them to no team.`)) {
      try {
        await setTeam({
          variables: {
            userId: memberId,
            teamId: 'none' // May need adjustment depending on backend
          }
        });
      } catch (error) {
        console.error('Failed to remove member:', error);
        alert('Failed to remove member, please try again later');
      }
    }
  };

  return (
    <div>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Team Name</TableCell>
              <TableCell>Members</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell>
                  <TextField
                    value={team.name}
                    data-testid='name'
                    onChange={(e) => handleEditTeamChange(team.id, e.target.value)}
                    onBlur={() => handleSaveEdit(team.id)}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Stack spacing={1} direction='row' flexWrap="wrap">
                    {team.members.map((member) => (
                      <Chip
                        key={member.id}
                        label={member.name}
                        color='primary'
                        deleteIcon={
                          <Tooltip title={`Remove ${member.name} from the team`}>
                            <RemoveCircleOutlineIcon />
                          </Tooltip>
                        }
                        onDelete={() => handleRemoveMember(member.id, member.name)}
                        sx={{
                          '& .MuiChip-deleteIcon': {
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&:hover': {
                              color: 'rgba(255, 255, 255, 1)',
                            },
                          },
                        }}
                      />
                    ))}
                    {team.members.length === 0 && (
                      <Chip
                        label="No Members"
                        variant="outlined"
                        size="small"
                        sx={{ color: 'text.secondary' }}
                      />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Tooltip title="Delete team">
                    <IconButton
                      data-testid='delete'
                      edge='end'
                      aria-label='delete'
                      onClick={() => handleDeleteTeam(team.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <div style={{ marginTop: '16px' }}>
        <TextField
          data-testid='addTeamName'
          label='Add New Team'
          value={newTeam}
          onChange={(e) => setNewTeam(e.target.value)}
          variant="outlined"
          size="small"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddTeam();
            }
          }}
        />
        <Tooltip title="Add team">
          <IconButton
            data-testid='addTeamButton'
            onClick={handleAddTeam}
            aria-label='add'
            style={{ marginLeft: '8px' }}
            color="primary"
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}
