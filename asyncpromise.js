const {Pool, Client} = require('pg');
const express = require('express');
const port =  process.env.port || 3000;
const app = express();


app.use(function(req, res, next) {    //CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader("Access-Control-Allow-Headers", "Origin, x-access-token, X-Requested-With, Content-Type, Accept");
  if ('OPTIONS' == req.method) {
      res.send(200);
  }
  else {
      next();
  }
});

const pool =  new Pool({
	user:'postgres',
	host:'localhost',
	database:'nfldb',
	password:'########',
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err)
    process.exit(-1)
  });
  
  /* returns all player records */
  app.get('/player',  (req,res) =>{
    pool.connect() 
      .then(client => { return client.query(`select * from player 
where status='Active' and (position ='WR' or position = 'RB' or position ='QB' or position='TE' or position='K')`)  
      .then(response => {
          client.release();
          res.json(response.rows);})
          .catch(err => {
            client.release();
            console.log(err); 
          })

   })});

 /* returns a player record */
  app.get('/player/:player_id',  (req,res) =>{
    pool.connect() 
      .then(client => { return client.query(`select * from player where player.player_id='${req.params.player_id}'`)  
      .then(response => {
          client.release();
          res.json(response.rows);})
          .catch(err => {
            client.release();
            console.log(err); 
          })

   })});


  /*
    returns a players receiving stats sorted by game for their career
  */

  app.get('/stats/game/receiving/:player_id', (req,res) => {
    pool.connect()
    .then(
      client => {
        return client.query(
          `select *, cast((stats.receiving_yds - stats.receiving_yac)as float)/ nullif(stats.receiving_rec,0) as Adot
           from (select season_year, game.gsis_id, full_name, player.player_id, sum(receiving_rec) as receiving_rec, 
                  sum(receiving_tar) as receiving_tar,sum(receiving_tds) as receiving_tds, 
                  sum(receiving_yac_yds) receiving_yac, sum(receiving_yds)as receiving_yds
                  from game
                  left join play_player on play_player.gsis_id = game.gsis_id
                  left join player on player.player_id = play_player.player_id
                where game.season_type='Regular'
                group by season_year, game.gsis_id, player.full_name, player.player_id
                order by game.gsis_id, season_year) as stats
          where stats.player_id = '${req.params.player_id}'`)
        .then(response => {
              client.release();
              res.json(response.rows); })
        .catch(e => {
              client.release();
              console.log(e); })
      }
    )
  });


  /* 
    returns a players receiving stats sorted by season for career 
  */
  app.get('/stats/season/receiving/:player_id',(req, res)=>{
    pool.connect()
      .then(
        client => {
          return client.query(
            `select *, cast((stats.receiving_yds- stats.receiving_yac) as float)/ nullif(stats.receiving_rec,0) as Adot
             from (select season_year, full_name, player.player_id, sum(receiving_rec) as receiving_rec, 
                      sum(receiving_tar) as receiving_tar,sum(receiving_tds) as receiving_tds, 
                      sum(receiving_yac_yds) receiving_yac, sum(receiving_yds)as receiving_yds
                  from game
                    left join play_player on play_player.gsis_id = game.gsis_id
                    left join player on player.player_id = play_player.player_id
                  where game.season_type='Regular'
                  group by season_year, player.full_name, player.player_id
                  order by season_year) as stats
              where stats.player_id = '${req.params.player_id}'`)
            .then( response => {
                client.release();
                res.json(response.rows);})
            .catch( e => {
              client.release();
              console.log(e); })
        }
      )
  });
  
  /* returns a players rushing stats sorted by game for year */

  app.get('/stats/game/rushing/:player_id',(req,res) => {
    pool.connect().then( ( client ) => {
      return client.query(`select *
                           from (select season_year, game.gsis_id, game.week, full_name, player.player_id, sum(rushing_att) as rushing_att, 
                                 sum(rushing_loss) as rushing_loss, sum(rushing_tds) as rushing_tds, 
                                 sum(rushing_loss_yds) as rushing_loss_yds, sum(rushing_yds)as rushing_yds
                                 from game
                                 left join play_player on play_player.gsis_id = game.gsis_id
                                 left join player on player.player_id = play_player.player_id
                                 where game.season_type='Regular'
                                 group by season_year, game.gsis_id, player.full_name, player.player_id
                                 order by game.gsis_id, season_year) as stats
                            where stats.player_id = '${req.params.player_id}'`)
              .then((response) => {
                client.release();
                res.json(response.rows);
              })
              .catch((e) => {
                client.release();
                console.log(e);
              })
    })
  });


  /*returns rushing stats ordered by season for career */

  app.get('/stats/season/rushing/:player_id', (req,res) => {
    pool.connect()
      .then((client) => {
        return client.query(`select *
                             from (select season_year, full_name, player.player_id, sum(rushing_att) as rushing_att, 
                                  sum(rushing_loss) as rushing_loss, sum(rushing_tds) as rushing_tds, 
                                  sum(rushing_loss_yds) as rushing_loss_yds, sum(rushing_yds)as rushing_yds
                                  from game
                                  left join play_player on play_player.gsis_id = game.gsis_id
                                  left join player on player.player_id = play_player.player_id
                                  where game.season_type='Regular'
                                  group by season_year, player.full_name, player.player_id
                                  order by  season_year) as stats
                            where stats.player_id = '${req.params.player_id}'`)
      .then((response) => {
        client.release();
        res.json(response.rows);
      })
      .catch(((e) => {
        client.release();
        console.log(e);
      }))
    })
  });

  /* returns passing stats ordered by game for career*/


  app.get('/stats/game/passing/:player_id', (req, res) => {
    pool.connect()
      .then((client) => {
        return client.query(`select *
                             from (select season_year, full_name, game.gsis_id, game.week, player.player_id, sum(passing_att) as passing_att, 
	                                 sum(passing_cmp) as passing_cmp, sum(play_player.passing_cmp_air_yds) as passing_cmp_air_yards, 
	                                 sum(passing_incmp) as passing_incmp, sum(play_player.passing_incmp_air_yds) as passing_incmp_air_yards,
		                               sum(passing_int) as passing_int, sum(passing_tds) as passing_tds, sum(passing_yds) as passing_yds
	                                 from game
	                                 left join play_player on play_player.gsis_id = game.gsis_id
	                                 left join player on player.player_id = play_player.player_id
                                   where game.season_type='Regular'
	                                 group by game.gsis_id, season_year, player.full_name, player.player_id
	                                 order by game.gsis_id, season_year) as stats
                             where stats.player_id = '${req.params.player_id}'`)
          .then((response) => {
            client.release();
            res.json(response.rows);
          })
          .catch((e) => {
            client.release(); 
            console.log(e);
          })
      })
  });

/* returns passing stats ordered by season for career */

app.get('/stats/season/passing/:player_id', (req,res) => {
  pool.connect()
    .then((client) => {
      return client.query(`select *
                         from (select season_year, full_name, player.player_id, sum(passing_att) as passing_att, 
                                 sum(passing_cmp) as passing_cmp, sum(play_player.passing_cmp_air_yds) as passing_cmp_air_yards, 
                                 sum(passing_incmp) as passing_incmp, sum(play_player.passing_incmp_air_yds) as passing_incmp_air_yards,
                                 sum(passing_int) as passing_int, sum(passing_tds) as passing_tds, sum(passing_yds) as passing_yds
                                 from game
                                 left join play_player on play_player.gsis_id = game.gsis_id
                                 left join player on player.player_id = play_player.player_id
                                 where game.season_type='Regular'
                                 group by  season_year, player.full_name, player.player_id
                                 order by  season_year) as stats
                            where stats.player_id = '${req.params.player_id}'`)
    .then((response) => {
      client.release();
      res.json(response.rows);
    })
    .catch((e) => {
      client.release();
      console.log(e);
    })
  })
}); 

/* returns target share for season */
app.get('/stats/targetshare/:team/:player_id', (req,res) => {
  pool.connect()
    .then( ( client ) => {
        return client.query(`select player_targets.season_year, player_targets.receiving_tar, team_targets.targets, Cast(player_targets.receiving_tar as float)/ Cast(team_targets.targets as float)* 100 as Tar_percentage
                             from 
                                 (select game.season_year, sum(receiving_tar) as receiving_tar 
                                  from play_player, game
                                  where play_player.player_id ='${req.params.player_id}' and play_player.gsis_id =  game.gsis_id and  game.season_type='Regular'
                                  group by game.season_year
                                  order by game.season_year) as player_targets,
                                  (select game.season_year, count(description)  as targets 
                                  from play, game 
                                  where description like '%pass%' and pos_team = '${req.params.team}' and play.gsis_id = game.gsis_id and game.season_type='Regular' and description not like '% No_Play_' 
                                  group by game.season_year
                                  order by game.season_year) as team_targets
                              where player_targets.season_year = team_targets.season_year`)
        .then( (response) => {
            client.release();
            res.json(response.rows);
        })
        .catch((e) => {
          client.release();
          console.log(e);
        })
    })
});

app.listen(port, ()=>{console.log(`listening on port ${port}..`)});
