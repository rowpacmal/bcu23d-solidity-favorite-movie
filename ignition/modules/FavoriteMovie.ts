import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const FavoriteMovieModule = buildModule('FavoriteMovieModule', (m) => {
  const favoriteMovie = m.contract('FavoriteMovie');

  return { favoriteMovie };
});

export default FavoriteMovieModule;
