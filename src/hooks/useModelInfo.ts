import { useState, useEffect } from 'react';
import { getModelDisplayName, getModelDisplayNameSync, getModelTier, getModelProvider } from '@/utils/modelUtils';

/**
 * Hook to get model display information
 */
export function useModelInfo(modelId: string) {
  // Start with a formatted version of the ID immediately
  const initialDisplayName = getModelDisplayNameSync(modelId);
  const [displayName, setDisplayName] = useState<string>(initialDisplayName);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!modelId) {
      setDisplayName('Unknown Model');
      setIsLoading(false);
      return;
    }

    // Try to get the name from API
    getModelDisplayName(modelId)
      .then(name => {
        setDisplayName(name);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching model name:', error);
        // Fall back to sync version
        setDisplayName(getModelDisplayNameSync(modelId));
        setIsLoading(false);
      });
  }, [modelId]);

  return {
    displayName,
    tier: getModelTier(modelId),
    provider: getModelProvider(modelId),
    isNew: modelId ? require('@/utils/modelUtils').isNewModel(modelId) : false,
    isLoading
  };
}

/**
 * Hook to get multiple model infos at once
 */
export function useModelsInfo(modelIds: string[]) {
  const [modelsInfo, setModelsInfo] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!modelIds.length) {
      setModelsInfo({});
      setIsLoading(false);
      return;
    }

    const loadModelsInfo = async () => {
      setIsLoading(true);
      const info: Record<string, any> = {};
      
      try {
        // Load all model names in parallel
        const namePromises = modelIds.map(async (modelId) => {
          const displayName = await getModelDisplayName(modelId);
          return { modelId, displayName };
        });
        
        const results = await Promise.all(namePromises);
        
        // Build the info object
        results.forEach(({ modelId, displayName }) => {
          info[modelId] = {
            displayName,
            tier: getModelTier(modelId),
            provider: getModelProvider(modelId),
            isNew: require('@/utils/modelUtils').isNewModel(modelId)
          };
        });
        
        setModelsInfo(info);
      } catch (error) {
        console.error('Error loading models info:', error);
        
        // Fall back to sync versions
        modelIds.forEach(modelId => {
          info[modelId] = {
            displayName: getModelDisplayNameSync(modelId),
            tier: getModelTier(modelId),
            provider: getModelProvider(modelId),
            isNew: require('@/utils/modelUtils').isNewModel(modelId)
          };
        });
        
        setModelsInfo(info);
      } finally {
        setIsLoading(false);
      }
    };

    loadModelsInfo();
  }, [modelIds.join(',')]);

  return {
    modelsInfo,
    isLoading
  };
}