<script>
  Array.prototype.forEach.call (document.querySelectorAll ('table.nv, table.nnv'), function (table) {
    Array.prototype.forEach.call (table.querySelectorAll ('tbody tr'), function (tr) {
      if (tr.children.length === 2 || tr.children.length === 3) {
        var data = tr.lastElementChild;
        data = data.querySelector ('data, time, code') || data;
        var td = document.createElement ('td');
        td.className = 'copy';
        var button = document.createElement ('button');
        button.type = 'button';
        button.textContent = 'Copy';
        button.onclick = function () {
          var range = document.createRange ();
          range.selectNode (data);
          getSelection ().empty ();
          getSelection ().addRange (range);
          document.execCommand ('copy')
        };
        td.appendChild (button);
        tr.appendChild (td);
      }
    });
  });
</script>
<script>
  var toc = document.querySelector ('.toc');
  if (toc)
    Array.prototype.forEach.call (document.querySelectorAll ('body > section > section'), function (section) {
      var header = section.querySelector ('h1');
      if (!header) return;
      var link = document.createElement ('a');
      link.href = '#' + encodeURIComponent (section.id);
      link.textContent = header.textContent;
      var li = document.createElement ('li');
      li.appendChild (link);
      toc.appendChild (li);
    });
</script>

<footer class=site>
  <a href=/ rel=top>Data.SuikaWiki.org</a>
  <a href=/license rel=license>&copy;</a>
</footer>

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-39820773-7', 'auto');
  ga('send', 'pageview');
</script>

<!--

Copyright 2015-2016 Wakaba <wakaba@suikawiki.org>.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Affero General Public License for more details.

You does not have received a copy of the GNU Affero General Public
License along with this program, see <http://www.gnu.org/licenses/>.

-->
