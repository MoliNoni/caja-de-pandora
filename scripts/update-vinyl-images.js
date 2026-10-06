#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const discogsToken = process.env.EXPO_PUBLIC_DISCOGS_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

if (!discogsToken) {
  console.error('Missing Discogs token. Add EXPO_PUBLIC_DISCOGS_TOKEN to .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para obtener portada de Discogs
const getDiscogsCoverUrl = async (releaseId) => {
  if (!releaseId) return null;

  try {
    const response = await fetch(`https://api.discogs.com/releases/${releaseId}`, {
      headers: {
        'Authorization': `Discogs token=${discogsToken}`,
        'User-Agent': 'VinylStore/1.0',
      },
    });

    if (!response.ok) {
      console.log(`  ❌ No se encontró release ${releaseId}`);
      return null;
    }

    const data = await response.json();

    // Buscar la imagen primaria
    const primaryImage = data.images?.find((img) => img.type === 'primary') || data.images?.[0];
    if (primaryImage?.uri) {
      return primaryImage.uri;
    }

    return null;
  } catch (error) {
    console.error('Error fetching from Discogs:', error.message);
    return null;
  }
};

const vinyls = [
  { titulo: 'Abbey Road', discogs_id: '3822187' },
  { titulo: 'Sgt. Pepper\'s Lonely Hearts Club Band', discogs_id: '602994' },
  { titulo: 'Dark Side of the Moon', discogs_id: '232237' },
  { titulo: 'Thriller', discogs_id: '249504' },
  { titulo: 'Back in Black', discogs_id: '240537' },
];

async function updateVinylImages() {
  console.log('🎵 Obteniendo imágenes de Discogs...\n');

  for (const vinyl of vinyls) {
    try {
      console.log(`Procesando: ${vinyl.titulo}`);

      const coverUrl = await getDiscogsCoverUrl(vinyl.discogs_id);
      
      if (coverUrl) {
        console.log(`  📷 Imagen encontrada`);
        
        // Actualizar en la BD
        const { error } = await supabase
          .from('productos')
          .update({ imageUrl: coverUrl })
          .eq('titulo', vinyl.titulo)
          .eq('category', 'vinyl');

        if (error) {
          console.error(`  ❌ Error actualizando BD:`, error.message);
        } else {
          console.log(`  ✅ Guardada en BD`);
        }
      } else {
        console.log(`  ⚠️  No se encontró imagen`);
      }

      // Respetar rate limit: 60 requests por minuto = 1 cada segundo
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error con ${vinyl.titulo}:`, error);
    }
  }

  console.log('\n✅ Proceso completado');
  process.exit(0);
}

updateVinylImages().catch((error) => {
  console.error('Error general:', error);
  process.exit(1);
});