import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { Add as AddIcon, Pets as PetsIcon } from '@mui/icons-material';
import { generateClient } from 'aws-amplify/api';
import { OWNER_AGE_GROUPS, CAT_AGE_GROUPS } from '../utils/ageGroups';

const client = generateClient();

const createCat = `
  mutation CreateCat($input: CreateCatInput!) {
    createCat(input: $input) {
      id
      name
      owner
      votes
      cageNumber
      ownerAgeGroup
      catAgeGroup
      peoplesChoiceGroup
    }
  }
`;

const listCats = `
  query ListCats {
    listCats {
      items {
        id
        cageNumber
        ownerAgeGroup
        catAgeGroup
        peoplesChoiceGroup
      }
    }
  }
`;



function AddCatForm({ onCatAdded }) {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [cageNumber, setCageNumber] = useState('');
  const [ownerAgeGroup, setOwnerAgeGroup] = useState('');
  const [catAgeGroup, setCatAgeGroup] = useState('');
  const [peoplesChoiceGroup, setPeoplesChoiceGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingCageNumbers, setExistingCageNumbers] = useState(new Set());
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchExistingCageNumbers();
  }, []);

  const fetchExistingCageNumbers = async () => {
    try {
      const result = await client.graphql({ query: listCats });
      const cageNumbers = new Set(
        result.data.listCats.items
          .map(cat => cat.cageNumber)
          .filter(num => num != null)
      );
      setExistingCageNumbers(cageNumbers);
    } catch (error) {
      console.error('Error fetching existing cage numbers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !owner.trim() || !cageNumber.trim() || !ownerAgeGroup || !catAgeGroup || !peoplesChoiceGroup) {
      alert('Please fill in all required fields');
      return;
    }

    const cageNum = parseInt(cageNumber.trim());
    if (isNaN(cageNum) || cageNum <= 0) {
      alert('Please enter a valid cage number');
      return;
    }

    if (existingCageNumbers.has(cageNum)) {
      alert(`Cage number ${cageNum} is already in use. Please choose a different number.`);
      return;
    }

    setLoading(true);
    try {
      await client.graphql({
        query: createCat,
        variables: {
          input: {
            name: name.trim(),
            owner: owner.trim(),
            cageNumber: cageNum,
            votes: 0,
            ownerAgeGroup,
            catAgeGroup,
            peoplesChoiceGroup: parseInt(peoplesChoiceGroup)
          }
        }
      });
      
      setName('');
      setOwner('');
      setCageNumber('');
      setOwnerAgeGroup('');
      setCatAgeGroup('');
      setPeoplesChoiceGroup('');
      // Update the existing cage numbers set
      setExistingCageNumbers(prev => new Set([...prev, cageNum]));
      onCatAdded();
    } catch (error) {
      console.error('Error adding cat:', error);
      alert('Error adding cat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={isMobile ? 0 : 2} sx={{ p: isMobile ? 2 : 3 }}>
      <Typography variant={isMobile ? "h6" : "h5"} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PetsIcon />
        Add New Cat Entry
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} data-testid="add-cat-form">
        {isMobile ? (
          /* Mobile: Single column with optimized spacing */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Cat Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter cat's name"
              required
              fullWidth
              size="small"
              sx={{ '& .MuiInputBase-root': { minHeight: 44 } }}
            />
            
            <TextField
              label="Owner Name"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Enter owner's name"
              required
              fullWidth
              size="small"
              sx={{ '& .MuiInputBase-root': { minHeight: 44 } }}
            />
            
            <TextField
              label="Cage Number"
              type="number"
              value={cageNumber}
              onChange={(e) => setCageNumber(e.target.value)}
              placeholder="Enter cage number"
              slotProps={{
                input: {
                  inputProps: { min: 1 }
                }
              }}
              required
              fullWidth
              size="small"
              error={Boolean(cageNumber && existingCageNumbers.has(parseInt(cageNumber)))}
              helperText={
                cageNumber && existingCageNumbers.has(parseInt(cageNumber))
                  ? `Cage number ${cageNumber} is already in use`
                  : ''
              }
              sx={{ '& .MuiInputBase-root': { minHeight: 44 } }}
            />

            <FormControl fullWidth required size="small">
              <InputLabel>Owner Age Group</InputLabel>
              <Select
                value={ownerAgeGroup}
                label="Owner Age Group"
                onChange={(e) => setOwnerAgeGroup(e.target.value)}
                sx={{ minHeight: 44 }}
              >
                {OWNER_AGE_GROUPS.map((group) => (
                  <MenuItem key={group.value} value={group.value}>
                    {group.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required size="small">
              <InputLabel>Cat Age Group</InputLabel>
              <Select
                value={catAgeGroup}
                label="Cat Age Group"
                onChange={(e) => setCatAgeGroup(e.target.value)}
                sx={{ minHeight: 44 }}
              >
                {CAT_AGE_GROUPS.map((group) => (
                  <MenuItem key={group.value} value={group.value}>
                    {group.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required size="small">
              <InputLabel>People's Choice Group</InputLabel>
              <Select
                value={peoplesChoiceGroup}
                label="People's Choice Group"
                onChange={(e) => setPeoplesChoiceGroup(e.target.value)}
                sx={{ minHeight: 44 }}
              >
                <MenuItem value="1">Group 1</MenuItem>
                <MenuItem value="2">Group 2</MenuItem>
                <MenuItem value="3">Group 3</MenuItem>
                <MenuItem value="4">Group 4</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              type="submit"
              variant="contained"
              disabled={Boolean(loading || (cageNumber && existingCageNumbers.has(parseInt(cageNumber))))}
              startIcon={<AddIcon />}
              fullWidth
              className="mobile-primary-button"
              sx={{ 
                mt: 2, 
                mb: 1, 
                minHeight: 48,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: 2
              }}
            >
              {loading ? 'Adding...' : 'Add Cat'}
            </Button>
          </Box>
        ) : (
          /* Desktop: Two column layout */
          <Grid container spacing={2}>
            <Grid size={{xs: 12, sm: 6}}>
              <TextField
                label="Cat Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter cat's name"
                required
                fullWidth
              />
            </Grid>
            
            <Grid size={{xs: 12, sm: 6}}>
              <TextField
                label="Owner Name"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Enter owner's name"
                required
                fullWidth
              />
            </Grid>
            
            <Grid size={{xs: 12, sm: 3}}>
              <TextField
                label="Cage Number"
                type="number"
                value={cageNumber}
                onChange={(e) => setCageNumber(e.target.value)}
                placeholder="Enter cage number"
                slotProps={{
                  input: {
                    inputProps: { min: 1 }
                  }
                }}
                required
                fullWidth
                error={Boolean(cageNumber && existingCageNumbers.has(parseInt(cageNumber)))}
                helperText={
                  cageNumber && existingCageNumbers.has(parseInt(cageNumber))
                    ? `Cage number ${cageNumber} is already in use`
                    : ''
                }
              />
            </Grid>

            <Grid size={{xs: 12, sm: 3}}>
              <FormControl fullWidth required>
                <InputLabel>Owner Age Group</InputLabel>
                <Select
                  value={ownerAgeGroup}
                  label="Owner Age Group"
                  onChange={(e) => setOwnerAgeGroup(e.target.value)}
                >
                  {OWNER_AGE_GROUPS.map((group) => (
                    <MenuItem key={group.value} value={group.value}>
                      {group.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{xs: 12, sm: 3}}>
              <FormControl fullWidth required>
                <InputLabel>Cat Age Group</InputLabel>
                <Select
                  value={catAgeGroup}
                  label="Cat Age Group"
                  onChange={(e) => setCatAgeGroup(e.target.value)}
                >
                  {CAT_AGE_GROUPS.map((group) => (
                    <MenuItem key={group.value} value={group.value}>
                      {group.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{xs: 12, sm: 3}}>
              <FormControl fullWidth required>
                <InputLabel>People's Choice Group</InputLabel>
                <Select
                  value={peoplesChoiceGroup}
                  label="People's Choice Group"
                  onChange={(e) => setPeoplesChoiceGroup(e.target.value)}
                >
                  <MenuItem value="1">Group 1</MenuItem>
                  <MenuItem value="2">Group 2</MenuItem>
                  <MenuItem value="3">Group 3</MenuItem>
                  <MenuItem value="4">Group 4</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{xs: 12}}>
              <Button
                type="submit"
                variant="contained"
                disabled={Boolean(loading || (cageNumber && existingCageNumbers.has(parseInt(cageNumber))))}
                startIcon={<AddIcon />}
                sx={{ mt: 1 }}
              >
                {loading ? 'Adding...' : 'Add Cat'}
              </Button>
            </Grid>
          </Grid>
        )}
      </Box>
    </Paper>
  );
}

export default AddCatForm;