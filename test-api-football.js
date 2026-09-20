// ============================================================
// PROBAR API-FOOTBALL — comprobacion rapida de cobertura,
// especialmente para 1a RFEF y para ver si trae corners/tarjetas.
// No guarda nada en ningun sitio, solo imprime resultados en el log.
// ============================================================

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE = 'https://v3.football.api-sports.io';

async function call(path, params){
  const url = new URL(BASE + path);
  Object.entries(params||{}).forEach(([k,v])=> url.searchParams.set(k,v));
  const resp = await fetch(url.toString(), {
    headers: { 'x-apisports-key': API_KEY }
  });
  const data = await resp.json();
  return { status: resp.status, data };
}

async function main(){
  console.log('=== 0. Estado de tu plan (limites reales) ===');
  const status = await call('/status', {});
  console.log(JSON.stringify(status.data.response, null, 2));

  console.log('\n=== 1. Ligas de España disponibles ===');
  const ligas = await call('/leagues', { country: 'Spain' });
  console.log('HTTP status:', ligas.status);
  if(ligas.data.errors && Object.keys(ligas.data.errors).length){
    console.log('ERRORES:', JSON.stringify(ligas.data.errors));
  }
  console.log(`Resultados: ${ligas.data.results}`);
  (ligas.data.response || []).forEach(l=>{
    console.log(`- [id ${l.league.id}] ${l.league.name} (${l.league.type}) — temporadas: ${l.seasons.map(s=>s.year).join(', ')}`);
  });

  const rfef = (ligas.data.response || []).find(l => /rfef|primera rfef|tercera/i.test(l.league.name));
  console.log('\n=== 2. ¿Aparece la RFEF? ===');
  console.log(rfef ? `SI -> ${rfef.league.name} (id ${rfef.league.id})` : 'NO aparece ninguna liga con "RFEF" o similar en el nombre.');

  console.log('\n=== 3. Prueba de partidos de Primera RFEF Grupo 1 (id 435), temporada 2025 ===');
  const fixturesRfef = await call('/fixtures', { league: 435, season: 2025, last: 3 });
  console.log('HTTP status:', fixturesRfef.status, '- Resultados:', fixturesRfef.data.results);
  if(fixturesRfef.data.errors && Object.keys(fixturesRfef.data.errors).length) console.log('ERRORES:', JSON.stringify(fixturesRfef.data.errors));
  for(const fx of (fixturesRfef.data.response || [])){
    console.log(`\nPartido: ${fx.teams.home.name} ${fx.goals.home}-${fx.goals.away} ${fx.teams.away.name} (${fx.fixture.date.slice(0,10)})`);
    const stats = await call('/fixtures/statistics', { fixture: fx.fixture.id });
    if(stats.data.response && stats.data.response.length){
      stats.data.response.forEach(teamStats=>{
        const corners = teamStats.statistics.find(s=>s.type.toLowerCase().includes('corner'));
        const cards = teamStats.statistics.find(s=>s.type.toLowerCase().includes('yellow'));
        console.log(`  ${teamStats.team.name}: corners=${corners?corners.value:'no disponible'}, tarjetas amarillas=${cards?cards.value:'no disponible'}`);
      });
    } else {
      console.log('  Sin estadisticas detalladas disponibles para este partido.');
    }
  }

  console.log('\n=== 4. Lo mismo pero con La Liga (id 140), por si el problema era solo la temporada ===');
  const fixturesLaLiga = await call('/fixtures', { league: 140, season: 2024, last: 2 });
  console.log('HTTP status:', fixturesLaLiga.status, '- Resultados:', fixturesLaLiga.data.results);
  if(fixturesLaLiga.data.errors && Object.keys(fixturesLaLiga.data.errors).length) console.log('ERRORES:', JSON.stringify(fixturesLaLiga.data.errors));

  console.log('\n=== Fin de la prueba ===');
}

main().catch(e=>{ console.error('Error:', e.message); process.exit(1); });
