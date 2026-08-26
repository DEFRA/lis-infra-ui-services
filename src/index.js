export const SUPPORTED_TAXONOMIES = [
  {
    id: 'register',
    slug: 'register',
    label: 'Register',
    summary: 'Capture and manage livestock registration activity.'
  },
  {
    id: 'move',
    slug: 'move',
    label: 'Move',
    summary: 'Coordinate movement-related livestock journeys and traceability.'
  },
  {
    id: 'death',
    slug: 'death',
    label: 'Death',
    summary: 'Capture livestock death notifications and downstream handling.'
  },
  {
    id: 'status',
    slug: 'status',
    label: 'Status',
    summary: 'Surface status information and lifecycle checks for livestock.',
    accessMode: 'hub-service'
  },
  {
    id: 'home',
    slug: 'home',
    label: 'Home',
    summary: 'Provide the default entry experience for each livestock species.'
  }
]

export const SUPPORTED_SPECIES = [
  {
    id: 'ctt',
    slug: 'cattle',
    label: 'Cattle',
    summary: 'Shared behaviour and wording for cattle journeys.'
  },
  {
    id: 'cml',
    slug: 'camlid',
    label: 'Camlid',
    summary: 'Shared behaviour and wording for camlid journeys.'
  },
  {
    id: 'chk',
    slug: 'chicken',
    label: 'Chicken',
    summary: 'Shared behaviour and wording for chicken journeys.'
  },
  {
    id: 'shp',
    slug: 'sheep',
    label: 'Sheep',
    summary: 'Shared behaviour and wording for sheep journeys.'
  },
  {
    id: 'gt',
    slug: 'goat',
    label: 'Goat',
    summary: 'Shared behaviour and wording for goat journeys.'
  }
]

export const SPOKES = [
  {
    id: 'cattle-register',
    label: 'Register for Cattle',
    taxonomy: {
      id: 'register',
      label: 'Register'
    },
    species: {
      id: 'cattle',
      label: 'Cattle'
    }
  },
  {
    id: 'camlid-register',
    label: 'Register for Camlid',
    taxonomy: {
      id: 'register',
      label: 'Register'
    },
    species: {
      id: 'camlid',
      label: 'Camlid'
    }
  },
  {
    id: 'chicken-register',
    label: 'Register for Chicken',
    taxonomy: {
      id: 'register',
      label: 'Register'
    },
    species: {
      id: 'chicken',
      label: 'Chicken'
    }
  },
  {
    id: 'sheep-register',
    label: 'Register for Sheep',
    taxonomy: {
      id: 'register',
      label: 'Register'
    },
    species: {
      id: 'sheep',
      label: 'Sheep'
    }
  },
  {
    id: 'goat-register',
    label: 'Register for Goat',
    taxonomy: {
      id: 'register',
      label: 'Register'
    },
    species: {
      id: 'goat',
      label: 'Goat'
    }
  },
  {
    id: 'cattle-move',
    label: 'Move for Cattle',
    taxonomy: {
      id: 'move',
      label: 'Move'
    },
    species: {
      id: 'cattle',
      label: 'Cattle'
    }
  },
  {
    id: 'camlid-move',
    label: 'Move for Camlid',
    taxonomy: {
      id: 'move',
      label: 'Move'
    },
    species: {
      id: 'camlid',
      label: 'Camlid'
    }
  },
  {
    id: 'chicken-move',
    label: 'Move for Chicken',
    taxonomy: {
      id: 'move',
      label: 'Move'
    },
    species: {
      id: 'chicken',
      label: 'Chicken'
    }
  },
  {
    id: 'sheep-move',
    label: 'Move for Sheep',
    taxonomy: {
      id: 'move',
      label: 'Move'
    },
    species: {
      id: 'sheep',
      label: 'Sheep'
    }
  },
  {
    id: 'goat-move',
    label: 'Move for Goat',
    taxonomy: {
      id: 'move',
      label: 'Move'
    },
    species: {
      id: 'goat',
      label: 'Goat'
    }
  },
  {
    id: 'cattle-death',
    label: 'Death for Cattle',
    taxonomy: {
      id: 'death',
      label: 'Death'
    },
    species: {
      id: 'cattle',
      label: 'Cattle'
    }
  },
  {
    id: 'camlid-death',
    label: 'Death for Camlid',
    taxonomy: {
      id: 'death',
      label: 'Death'
    },
    species: {
      id: 'camlid',
      label: 'Camlid'
    }
  },
  {
    id: 'chicken-death',
    label: 'Death for Chicken',
    taxonomy: {
      id: 'death',
      label: 'Death'
    },
    species: {
      id: 'chicken',
      label: 'Chicken'
    }
  },
  {
    id: 'sheep-death',
    label: 'Death for Sheep',
    taxonomy: {
      id: 'death',
      label: 'Death'
    },
    species: {
      id: 'sheep',
      label: 'Sheep'
    }
  },
  {
    id: 'goat-death',
    label: 'Death for Goat',
    taxonomy: {
      id: 'death',
      label: 'Death'
    },
    species: {
      id: 'goat',
      label: 'Goat'
    }
  },
  {
    id: 'cattle-status',
    label: 'Status for Cattle',
    taxonomy: {
      id: 'status',
      label: 'Status'
    },
    species: {
      id: 'cattle',
      label: 'Cattle'
    }
  },
  {
    id: 'camlid-status',
    label: 'Status for Camlid',
    taxonomy: {
      id: 'status',
      label: 'Status'
    },
    species: {
      id: 'camlid',
      label: 'Camlid'
    }
  },
  {
    id: 'chicken-status',
    label: 'Status for Chicken',
    taxonomy: {
      id: 'status',
      label: 'Status'
    },
    species: {
      id: 'chicken',
      label: 'Chicken'
    }
  },
  {
    id: 'sheep-status',
    label: 'Status for Sheep',
    taxonomy: {
      id: 'status',
      label: 'Status'
    },
    species: {
      id: 'sheep',
      label: 'Sheep'
    }
  },
  {
    id: 'goat-status',
    label: 'Status for Goat',
    taxonomy: {
      id: 'status',
      label: 'Status'
    },
    species: {
      id: 'goat',
      label: 'Goat'
    }
  },
  {
    id: 'cattle-home',
    label: 'Home for Cattle',
    taxonomy: {
      id: 'home',
      label: 'Home'
    },
    species: {
      id: 'cattle',
      label: 'Cattle'
    }
  },
  {
    id: 'camlid-home',
    label: 'Home for Camlid',
    taxonomy: {
      id: 'home',
      label: 'Home'
    },
    species: {
      id: 'camlid',
      label: 'Camlid'
    }
  },
  {
    id: 'chicken-home',
    label: 'Home for Chicken',
    taxonomy: {
      id: 'home',
      label: 'Home'
    },
    species: {
      id: 'chicken',
      label: 'Chicken'
    }
  },
  {
    id: 'sheep-home',
    label: 'Home for Sheep',
    taxonomy: {
      id: 'home',
      label: 'Home'
    },
    species: {
      id: 'sheep',
      label: 'Sheep'
    }
  },
  {
    id: 'goat-home',
    label: 'Home for Goat',
    taxonomy: {
      id: 'home',
      label: 'Home'
    },
    species: {
      id: 'goat',
      label: 'Goat'
    }
  }
]

/**
 * @param {string} taxonomy
 * @param {string} species
 * @returns {string}
 */
export function buildMicrositePath(taxonomy, species) {
  return `/${species}/${taxonomy}`
}

export { createHoldingService } from './services/holding-service/service.js'
