export const SUPPORTED_TAXONOMIES = [
  {
    "id": "register",
    "slug": "register",
    "label": "Register",
    "summary": "Capture and manage livestock registration activity."
  },
  {
    "id": "move",
    "slug": "move",
    "label": "Move",
    "summary": "Coordinate movement-related livestock journeys and traceability."
  },
  {
    "id": "death",
    "slug": "death",
    "label": "Death",
    "summary": "Capture livestock death notifications and downstream handling."
  },
  {
    "id": "status",
    "slug": "status",
    "label": "Status",
    "summary": "Surface status information and lifecycle checks for livestock.",
    "accessMode": "hub-service"
  },
  {
    "id": "home",
    "slug": "home",
    "label": "Home",
    "summary": "Provide the default entry experience for each livestock species."
  }
]

export const SUPPORTED_SPECIES = [
  {
    "id": "ctt",
    "slug": "cattle",
    "label": "Cattle",
    "summary": "Shared behaviour and wording for cattle journeys."
  },
  {
    "id": "cml",
    "slug": "camlid",
    "label": "Camlid",
    "summary": "Shared behaviour and wording for camlid journeys."
  },
  {
    "id": "chk",
    "slug": "chicken",
    "label": "Chicken",
    "summary": "Shared behaviour and wording for chicken journeys."
  },
  {
    "id": "shp",
    "slug": "sheep",
    "label": "Sheep",
    "summary": "Shared behaviour and wording for sheep journeys."
  },
  {
    "id": "gt",
    "slug": "goat",
    "label": "Goat",
    "summary": "Shared behaviour and wording for goat journeys."
  }
]

export const SPOKES = [
  {
    "id": "cattle-register",
    "label": "Register for Cattle",
    "path": "/cattle/register",
    "port": 3201,
    "taxonomy": {
      "id": "register",
      "label": "Register"
    },
    "species": {
      "id": "cattle",
      "label": "Cattle"
    }
  },
  {
    "id": "camlid-register",
    "label": "Register for Camlid",
    "path": "/camlid/register",
    "port": 3202,
    "taxonomy": {
      "id": "register",
      "label": "Register"
    },
    "species": {
      "id": "camlid",
      "label": "Camlid"
    }
  },
  {
    "id": "chicken-register",
    "label": "Register for Chicken",
    "path": "/chicken/register",
    "port": 3203,
    "taxonomy": {
      "id": "register",
      "label": "Register"
    },
    "species": {
      "id": "chicken",
      "label": "Chicken"
    }
  },
  {
    "id": "sheep-register",
    "label": "Register for Sheep",
    "path": "/sheep/register",
    "port": 3213,
    "taxonomy": {
      "id": "register",
      "label": "Register"
    },
    "species": {
      "id": "sheep",
      "label": "Sheep"
    }
  },
  {
    "id": "goat-register",
    "label": "Register for Goat",
    "path": "/goat/register",
    "port": 3214,
    "taxonomy": {
      "id": "register",
      "label": "Register"
    },
    "species": {
      "id": "goat",
      "label": "Goat"
    }
  },
  {
    "id": "cattle-move",
    "label": "Move for Cattle",
    "path": "/cattle/move",
    "port": 3204,
    "taxonomy": {
      "id": "move",
      "label": "Move"
    },
    "species": {
      "id": "cattle",
      "label": "Cattle"
    }
  },
  {
    "id": "camlid-move",
    "label": "Move for Camlid",
    "path": "/camlid/move",
    "port": 3205,
    "taxonomy": {
      "id": "move",
      "label": "Move"
    },
    "species": {
      "id": "camlid",
      "label": "Camlid"
    }
  },
  {
    "id": "chicken-move",
    "label": "Move for Chicken",
    "path": "/chicken/move",
    "port": 3206,
    "taxonomy": {
      "id": "move",
      "label": "Move"
    },
    "species": {
      "id": "chicken",
      "label": "Chicken"
    }
  },
  {
    "id": "sheep-move",
    "label": "Move for Sheep",
    "path": "/sheep/move",
    "port": 3215,
    "taxonomy": {
      "id": "move",
      "label": "Move"
    },
    "species": {
      "id": "sheep",
      "label": "Sheep"
    }
  },
  {
    "id": "goat-move",
    "label": "Move for Goat",
    "path": "/goat/move",
    "port": 3216,
    "taxonomy": {
      "id": "move",
      "label": "Move"
    },
    "species": {
      "id": "goat",
      "label": "Goat"
    }
  },
  {
    "id": "cattle-death",
    "label": "Death for Cattle",
    "path": "/cattle/death",
    "port": 3207,
    "taxonomy": {
      "id": "death",
      "label": "Death"
    },
    "species": {
      "id": "cattle",
      "label": "Cattle"
    }
  },
  {
    "id": "camlid-death",
    "label": "Death for Camlid",
    "path": "/camlid/death",
    "port": 3208,
    "taxonomy": {
      "id": "death",
      "label": "Death"
    },
    "species": {
      "id": "camlid",
      "label": "Camlid"
    }
  },
  {
    "id": "chicken-death",
    "label": "Death for Chicken",
    "path": "/chicken/death",
    "port": 3209,
    "taxonomy": {
      "id": "death",
      "label": "Death"
    },
    "species": {
      "id": "chicken",
      "label": "Chicken"
    }
  },
  {
    "id": "sheep-death",
    "label": "Death for Sheep",
    "path": "/sheep/death",
    "port": 3217,
    "taxonomy": {
      "id": "death",
      "label": "Death"
    },
    "species": {
      "id": "sheep",
      "label": "Sheep"
    }
  },
  {
    "id": "goat-death",
    "label": "Death for Goat",
    "path": "/goat/death",
    "port": 3218,
    "taxonomy": {
      "id": "death",
      "label": "Death"
    },
    "species": {
      "id": "goat",
      "label": "Goat"
    }
  },
  {
    "id": "cattle-status",
    "label": "Status for Cattle",
    "path": "/cattle/status",
    "port": 3210,
    "taxonomy": {
      "id": "status",
      "label": "Status"
    },
    "species": {
      "id": "cattle",
      "label": "Cattle"
    }
  },
  {
    "id": "camlid-status",
    "label": "Status for Camlid",
    "path": "/camlid/status",
    "port": 3211,
    "taxonomy": {
      "id": "status",
      "label": "Status"
    },
    "species": {
      "id": "camlid",
      "label": "Camlid"
    }
  },
  {
    "id": "chicken-status",
    "label": "Status for Chicken",
    "path": "/chicken/status",
    "port": 3212,
    "taxonomy": {
      "id": "status",
      "label": "Status"
    },
    "species": {
      "id": "chicken",
      "label": "Chicken"
    }
  },
  {
    "id": "sheep-status",
    "label": "Status for Sheep",
    "path": "/sheep/status",
    "port": 3219,
    "taxonomy": {
      "id": "status",
      "label": "Status"
    },
    "species": {
      "id": "sheep",
      "label": "Sheep"
    }
  },
  {
    "id": "goat-status",
    "label": "Status for Goat",
    "path": "/goat/status",
    "port": 3220,
    "taxonomy": {
      "id": "status",
      "label": "Status"
    },
    "species": {
      "id": "goat",
      "label": "Goat"
    }
  },
  {
    "id": "cattle-home",
    "label": "Home for Cattle",
    "path": "/cattle/home",
    "port": 3221,
    "taxonomy": {
      "id": "home",
      "label": "Home"
    },
    "species": {
      "id": "cattle",
      "label": "Cattle"
    }
  },
  {
    "id": "camlid-home",
    "label": "Home for Camlid",
    "path": "/camlid/home",
    "port": 3222,
    "taxonomy": {
      "id": "home",
      "label": "Home"
    },
    "species": {
      "id": "camlid",
      "label": "Camlid"
    }
  },
  {
    "id": "chicken-home",
    "label": "Home for Chicken",
    "path": "/chicken/home",
    "port": 3223,
    "taxonomy": {
      "id": "home",
      "label": "Home"
    },
    "species": {
      "id": "chicken",
      "label": "Chicken"
    }
  },
  {
    "id": "sheep-home",
    "label": "Home for Sheep",
    "path": "/sheep/home",
    "port": 3224,
    "taxonomy": {
      "id": "home",
      "label": "Home"
    },
    "species": {
      "id": "sheep",
      "label": "Sheep"
    }
  },
  {
    "id": "goat-home",
    "label": "Home for Goat",
    "path": "/goat/home",
    "port": 3225,
    "taxonomy": {
      "id": "home",
      "label": "Home"
    },
    "species": {
      "id": "goat",
      "label": "Goat"
    }
  }
]

export function buildMicrositePath(taxonomy, species) {
  return `/${species}/${taxonomy}`
}

export { createProfileService } from './services/profile-service/service.js'
export { createHoldingService } from './services/holding-service/service.js'
