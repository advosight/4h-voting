import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Edit as EditIcon,
  QrCode as QrCodeIcon,
  HowToVote as VoteIcon,
  EmojiEvents as TrophyIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/api';
import { OWNER_AGE_GROUPS, CAT_AGE_GROUPS, getOwnerAgeGroupLabel, getCatAgeGroupLabel } from '../utils/ageGroups';
import { BREED_CATEGORIES, getBreedCategoryLabel } from '../utils/breedCategories';

const client = generateClient();

const updateCat = `
  mutation UpdateCat($id: ID!, $input: UpdateCatInput!) {
    updateCat(id: $id, input: $input) {
      id
      name
      owner
      votes
      cageNumber
      ownerAgeGroup
      catAgeGroup
      peoplesChoiceGroup
      breedCategory
    }
  }
`;

const deleteCat = `
  mutation DeleteCat($id: ID!) {
    deleteCat(id: $id) {
      id
    }
  }
`;

interface CatCardProps {
  cat: any;
  rank: number;
  onUpdate: () => void;
  isAdmin?: boolean;
}



function CatCard({ cat, rank, onUpdate, isAdmin = false }: CatCardProps): JSX.Element {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [name, setName] = useState<string>(cat.name);
  const [owner, setOwner] = useState<string>(cat.owner);
  const [cageNumber, setCageNumber] = useState<number>(cat.cageNumber || 1);
  const [votes, setVotes] = useState<number>(cat.votes);
  const [ownerAgeGroup, setOwnerAgeGroup] = useState<string>(cat.ownerAgeGroup || '');
  const [catAgeGroup, setCatAgeGroup] = useState<string>(cat.catAgeGroup || '');
  const [peoplesChoiceGroup, setPeoplesChoiceGroup] = useState<string>(cat.peoplesChoiceGroup?.toString() || '');
  const [breedCategory, setBreedCategory] = useState<string>(cat.breedCategory || '');

  const handleGenerateSign = () => {
    navigate(`/sign/${cat.id}`);
  };

  const handleTestVote = () => {
    window.open(`${import.meta.env.VITE_VOTING_API_ENDPOINT || 'https://s2fhl5bike.execute-api.us-west-2.amazonaws.com/prod/'}vote/${cat.id}`, '_blank');
  };

  const handleSave = async () => {
    try {
      await client.graphql({
        query: updateCat,
        variables: {
          id: cat.id,
          input: {
            name: name.trim(),
            owner: owner.trim(),
            cageNumber: parseInt(cageNumber),
            votes: votes,
            ownerAgeGroup,
            catAgeGroup,
            peoplesChoiceGroup: peoplesChoiceGroup ? parseInt(peoplesChoiceGroup) : null,
            breedCategory
          }
        }
      });
      setEditing(false);
      // Update local state immediately for smooth animation
      setTimeout(() => onUpdate(), 100);
    } catch (error) {
      console.error('Error updating cat:', error);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteError(null);
      await client.graphql({
        query: deleteCat,
        variables: { id: cat.id }
      });
      setDeleting(false);
      onUpdate();
    } catch (error) {
      console.error('Error deleting cat:', error);
      setDeleteError('Failed to delete this entry. Please try again.');
    }
  };

  const getRankEmoji = (rank) => {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🐱';
    }
  };

  return (
    <>
      <Card 
        elevation={3}
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 6,
          }
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getRankEmoji(rank)} Cage {cat.cageNumber}
              </Typography>
              <Typography variant="h5" color="primary" gutterBottom>
                {cat.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Owner: {cat.owner}
              </Typography>
              {cat.ownerAgeGroup && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Owner: {getOwnerAgeGroupLabel(cat.ownerAgeGroup)}
                </Typography>
              )}
              {cat.catAgeGroup && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Cat: {getCatAgeGroupLabel(cat.catAgeGroup)}
                </Typography>
              )}
              {cat.peoplesChoiceGroup && (
                <Typography variant="caption" color="text.secondary" display="block">
                  People's Choice: Group {cat.peoplesChoiceGroup}
                </Typography>
              )}
              {cat.breedCategory && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Breed: {getBreedCategoryLabel(cat.breedCategory)}
                </Typography>
              )}
            </Box>
            <Chip 
              label={cat.votes}
              color="secondary"
              size="large"
              sx={{ 
                fontSize: '1.2rem',
                fontWeight: 'bold',
                minWidth: 60,
              }}
            />
          </Box>
        </CardContent>
        
        {isAdmin && (
          <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
            <Tooltip title="Sign">
              <IconButton
                size="small"
                onClick={handleGenerateSign}
                aria-label="Sign"
              >
                <QrCodeIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => setEditing(true)}
                aria-label="Edit"
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Test">
              <IconButton
                size="small"
                onClick={handleTestVote}
                aria-label="Test"
              >
                <VoteIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleting(true)}
                aria-label="Delete"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </CardActions>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editing} onClose={() => setEditing(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Cat Information</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Cat Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              fullWidth
            />
            <TextField
              label="Cage Number"
              type="number"
              value={cageNumber}
              onChange={(e) => setCageNumber(parseInt(e.target.value) || 1)}
              fullWidth
            />
            <TextField
              label="Votes"
              type="number"
              value={votes}
              onChange={(e) => setVotes(parseInt(e.target.value) || 0)}
              slotProps={{
                input: {
                  inputProps: { min: 0 }
                }
              }}
              fullWidth
            />
            
            <FormControl fullWidth>
              <InputLabel>Owner Age Group</InputLabel>
              <Select
                value={ownerAgeGroup}
                label="Owner Age Group"
                onChange={(e) => setOwnerAgeGroup(e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {OWNER_AGE_GROUPS.map((group) => (
                  <MenuItem key={group.value} value={group.value}>
                    {group.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Cat Age Group</InputLabel>
              <Select
                value={catAgeGroup}
                label="Cat Age Group"
                onChange={(e) => setCatAgeGroup(e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {CAT_AGE_GROUPS.map((group) => (
                  <MenuItem key={group.value} value={group.value}>
                    {group.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>People's Choice Group</InputLabel>
              <Select
                value={peoplesChoiceGroup}
                label="People's Choice Group"
                onChange={(e) => setPeoplesChoiceGroup(e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                <MenuItem value="1">Group 1</MenuItem>
                <MenuItem value="2">Group 2</MenuItem>
                <MenuItem value="3">Group 3</MenuItem>
                <MenuItem value="4">Group 4</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Breed Category</InputLabel>
              <Select
                value={breedCategory}
                label="Breed Category"
                onChange={(e) => setBreedCategory(e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {BREED_CATEGORIES.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleting} onClose={() => setDeleting(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Cage {cat.cageNumber}?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently remove {cat.name} (Cage {cat.cageNumber}) and all associated votes. This cannot be undone.
          </Typography>
          {deleteError && (
            <Typography color="error" sx={{ mt: 2 }}>
              {deleteError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(false)}>
            Cancel
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default CatCard;