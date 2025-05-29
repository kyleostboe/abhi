"use client"

import { Box, Spinner, Text, VStack } from "@chakra-ui/react"

export default function Loading() {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh" bg="gray.50">
      <VStack spacing={4}>
        <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color="teal.500" size="xl" />
        <Text fontSize="lg" color="gray.600">
          Loading Meditation Adjuster...
        </Text>
      </VStack>
    </Box>
  )
}
