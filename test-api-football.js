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
  console.log('=== 1. Ligas de España disponibles ===');
  const ligas = await call('/leagues', { country: 'Spain' });
  console.log('HTTP status:', ligas.status);
  if(ligas.data.errors && Object.keys(ligas.data.errors).length){
    console.log('ERRORES:', JSON.stringify(ligas.data.errors));
  }
  console.log(`Peticiones usadas hoy: ${ligas.data.paging ? '(ver cabecera x-ratelimit)' : '?'} / Resultados: ${ligas.data.results}`);
  (ligas.data.response || []).forEach(l=>{
    console.log(`- [id ${l.league.id}] ${l.league.name} (${l.league.type}) — temporadas: ${l.seasons.map(s=>s.year).join(', ')}`);
  });

  const rfef = (ligas.data.response || []).find(l => /rfef|primera rfef|tercera/i.test(l.league.name));
  console.log('\n=== 2. ¿Aparece la RFEF? ===');
  console.log(rfef ? `SI -> ${rfef.league.name} (id ${rfef.league.id})` : 'NO aparece ninguna liga con "RFEF" o similar en el nombre.');

  console.log('\n=== 3. Prueba de un partido real de Primera (La Liga, id 140) con estadisticas ===');
  // La Liga suele tener id fijo 140 en API-Football; buscamos partidos recientes terminados
  const fixtures = await call('/fixtures', { league: 140, season: 2025, last: 3 });
  console.log('HTTP status:', fixtures.status, '- Resultados:', fixtures.data.results);
  for(const fx of (fixtures.data.response || [])){
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

  console.log('\n=== Fin de la prueba ===');
}

main().catch(e=>{ console.error('Error:', e.message); process.exit(1); });
