module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.dependencies && pkg.dependencies.sharp) {
        pkg.dependencies.sharp = '>=0.35.0';
      }
      if (pkg.dependencies && pkg.dependencies.postcss) {
        pkg.dependencies.postcss = '>=8.5.18';
      }
      return pkg;
    }
  }
}
