(function () {

  self.getKageGlyphSVG = async function (getSource, name) {
    var kage = new Kage ();
    kage.kUseCurve = false;
    var polygons = new Polygons ();

    var max = 1000;
    var incorrect = false;
    var need = [name];
    var seen = {};
    while (need.length) {
      var oldNeed = need;
      need = [];
      while (oldNeed.length) {
        var n = oldNeed.shift ();
        seen[n] = true;
        var source = await getSource (n);
        if (source) {
          source.split (/:/).forEach (p => {
            if (! (/^-?[0-9]+(?:\$[0-9]+$|)$/.test (p))) {
              if (/\@/.test (p)) incorrect = true;
              p = p.split (/\$/)[0];
              if (!seen[p]) need.push (p);
            }
          });
          kage.kBuhin.push (n, source);
        } else {
          console.log ("|"+name+"|: Glyph source data |"+n+"| is not available");
          incorrect = true;
        }
      }
      if (max-- < 0) {
        console.log ("|"+name+"|: Glyph source data |"+name+"| is too complex");
        incorrect = true;
        break;
      }
    }
    
    kage.makeGlyph (polygons, name);
    return {
      svg: polygons.generateSVG (false),
      incorrect,
    };
  };

  /* License: Public Domain. */
}) (self);
