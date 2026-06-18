import React from 'react';
import { Skeleton, Stack } from '@mui/material';

export default function LoadingSkeleton({ rows = 3 }) {
  return (
    <Stack spacing={1}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} variant="rounded" height={index === 0 ? 48 : 36} />
      ))}
    </Stack>
  );
}
