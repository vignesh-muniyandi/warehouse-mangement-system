import React, { useState } from 'react';
import { Box, Button, Stack, TextField } from '@mui/material';

export default function PODUploader({ onSubmit }) {
  const [shipmentId, setShipmentId] = useState('');
  const [signature, setSignature] = useState(null);
  const [photo, setPhoto] = useState(null);

  const submit = () => {
    const fd = new FormData();
    fd.append('shipment_id', shipmentId);
    if (signature) fd.append('signature', signature);
    if (photo) fd.append('photo', photo);
    onSubmit(fd);
  };

  return (
    <Box>
      <TextField label="Shipment ID" value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} />
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" component="label">Upload Signature<input type="file" hidden onChange={(e) => setSignature(e.target.files[0])} /></Button>
        <Button variant="outlined" component="label">Upload Photo<input type="file" hidden onChange={(e) => setPhoto(e.target.files[0])} /></Button>
        <Button variant="contained" onClick={submit}>Submit</Button>
      </Stack>
    </Box>
  );
}
