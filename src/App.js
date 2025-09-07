import React, { useState } from 'react';
import {
  Container, Typography, Box, Button, Paper, List, ListItem, ListItemText,
  CircularProgress, Stack, Alert, Snackbar,
  IconButton, Tooltip, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [actionItems, setActionItems] = useState([]);
  const [utterances, setUtterances] = useState([]);
  const [transcriptId, setTranscriptId] = useState(null);
  const [error, setError] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const speakerLabel = (id) => (id == null ? "Unknown" : `Speaker ${id}`);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setSummary(null);
      setActionItems([]);
      setUtterances([]);
      setTranscriptId(null);
      setError(null);
    }
  };

  const handleClear = () => {
    setFile(null);
    setSummary(null);
    setActionItems([]);
    setUtterances([]);
    setTranscriptId(null);
    setError(null);
  };

  // Fetch diarization separately by transcript ID
  const fetchDiarization = async (transcriptId) => {
    try {
      const res = await fetch(`http://localhost:8000/diarization/${transcriptId}`);
      if (!res.ok) throw new Error(`Failed to fetch diarization: ${res.statusText}`);
      const data = await res.json();
      setUtterances(data.utterances || []);
    } catch (err) {
      setError('Failed to fetch diarization: ' + err.message);
      setShowSnackbar(true);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSummary(null);
    setActionItems([]);
    setUtterances([]);
    setTranscriptId(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/upload/', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`Server error: ${res.statusText}`);
      const data = await res.json();

      setSummary(data.summary || "Summary not available");
      setActionItems(data.actions || []);
      setTranscriptId(data.transcript_id || null);

      // Initially set diarization if returned in response
      setUtterances(data.utterances || []);

      // Optionally fetch diarization again from backend endpoint
      if (data.transcript_id) {
        await fetchDiarization(data.transcript_id);
      }

      if (!data.summary && (!data.actions || data.actions.length === 0)) {
        setError("No summary or action items returned. Please try a different file.");
        setShowSnackbar(true);
      }
    } catch (err) {
      setError('Upload failed: ' + err.message);
      setShowSnackbar(true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Typography variant="h3" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
        AI Meeting Intelligence Platform
      </Typography>
      <Paper elevation={6} sx={{ p: 4, mb: 5, borderRadius: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Upload Meeting Audio/Video
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              disabled={uploading}
              sx={{ mb: 1 }}
            >
              {file ? file.name : "Choose File"}
              <input hidden type="file" accept="audio/*,video/*" onChange={handleFileChange} />
            </Button>
            {file && (
              <Tooltip title="Clear selected file">
                <IconButton size="small" onClick={handleClear} sx={{ ml: 1 }}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Box>
            <Button
              variant="contained"
              color="primary"
              disabled={!file || uploading}
              onClick={handleUpload}
              startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ minWidth: 160, fontWeight: 600 }}
            >
              {uploading ? 'Uploading...' : 'Upload & Process'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Meeting Summary */}
      {summary && (
        <Paper elevation={4} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom fontWeight={700}>
            Meeting Summary
          </Typography>
          <Typography
            component="pre"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
              fontSize: '1.1rem',
              color: 'text.primary',
              maxHeight: 300,
              overflowY: 'auto',
            }}
          >
            {summary}
          </Typography>
        </Paper>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <Paper elevation={4} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom fontWeight={700}>
            Action Items
          </Typography>
          <List dense>
            {actionItems.map((item, index) => (
              <ListItem key={index} sx={{ paddingLeft: 0 }}>
                <ListItemText primary={`• ${item}`} primaryTypographyProps={{ fontSize: '1rem' }} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Speaker Diarized Transcript */}
      {utterances.length > 0 && (
        <Paper elevation={4} sx={{ p: 4, mb: 5, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom fontWeight={700}>
            Speaker Diarized Transcript
          </Typography>
          {utterances.map((utt, idx) => (
            <Accordion key={idx} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={600}>
                  {speakerLabel(utt.speaker)}{' '}
                  <Typography component="span" sx={{ ml: 1, fontWeight: 400, color: 'text.secondary' }}>
                    [{utt.start.toFixed(2)}s - {utt.end.toFixed(2)}s]
                  </Typography>
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{utt.text}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      )}

      {/* Error Snackbar */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {error ? <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert> : null}
      </Snackbar>
    </Container>
  );
}

export default App;
