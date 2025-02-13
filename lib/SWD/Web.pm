package SWD::Web;
use strict;
use warnings;
use Path::Tiny;
use Promise;
use Promised::File;
use Web::URL::Encoding;
use JSON::PS;
use Wanage::HTTP;
use Warabe::App;

sub psgi_app ($) {
  my ($class) = @_;

  return sub {
    my $http = Wanage::HTTP->new_from_psgi_env ($_[0]);
    my $app = Warabe::App->new_from_http ($http);

    $http->set_response_header
        ('Strict-Transport-Security' => 'max-age=10886400; includeSubDomains; preload');

    return $app->execute_by_promise (sub {
      return $class->main ($app);
    });
  };
} # psgi_app

my $RootPath = path (__FILE__)->parent->parent->parent;

sub static ($$$;%) {
  my ($app, $type, $name, %args) = @_;
  $app->http->set_response_header ('Content-Type' => $type);
  $app->http->set_response_header ('Content-Encoding' => 'gzip') if $args{gzip};
  my $file = Promised::File->new_from_path ($RootPath->child ($name));
  return $file->stat->then (sub {
    $app->http->set_response_last_modified ($_[0]->mtime);
    return $file->read_byte_string;
  }, sub {
    return $app->throw_error (404);
  })->then (sub {
    $app->http->send_response_body_as_ref (\($_[0]));
    $app->http->close_response_body;
  });
} # static

my $SWWPages = json_bytes2perl $RootPath->child ('local/data/sww-pages.json')->slurp;

sub main ($$$) {
  my ($class, $app) = @_;
  my $path = $app->path_segments;

  if ($app->http->request_method eq 'GET' and
      keys %$SWD::Web::CORSAllowedOrigins) {
    $app->http->add_response_header ('vary', 'origin');
    my $origin = $app->http->get_request_header ('origin') // '';
    if ($origin and $SWD::Web::CORSAllowedOrigins->{$origin}) {
      $app->http->set_response_header ('access-control-allow-origin', $origin);
    }
  }

  if (@$path == 2 and $path->[0] eq 'css' and $path->[1] eq 'common.css') {
    # /css/common.css
    return static $app, 'text/css; charset=utf-8', 'css/common.css';
  } elsif (@$path == 2 and $path->[0] eq 'css' and $path->[1] eq 'default.css') {
    # /css/default.css
    return static $app, 'text/css; charset=utf-8', 'css/default.css';
  }

  if (@$path == 2 and $path->[0] eq 'js' and
      $path->[1] =~ /\A[a-z0-9]+\.js\z/) {
    # /js/{name}.js
    return static $app, 'text/javascript; charset=utf-8', 'js/' . $path->[1];
  }

  if (@$path == 2 and $path->[0] eq 'spots') {
    # //WORLD/spots/{spot_id}
    my $mapped = $SWWPages->{$path->[1]};
    if (defined $mapped) {
      return $app->throw_redirect ('https://wiki.suikawiki.org/n/' . $mapped);
    }

    if ($path->[1] eq 'search') {
      # //WORLD/spots/search?q={text}
      return $app->throw_redirect ('https://wiki.suikawiki.org/n/Wiki%2F%2FSearch?q=' . percent_encode_c ($app->text_param ('q') // ''));
    }
  }

  if (@$path == 4 and
      $path->[0] eq 'data' and
      $path->[1] eq 'charrels' and
      $path->[2] =~ m{\A[a-z0-9]+\z} and
      $path->[3] =~ m{\A[0-9A-Za-z_-]+\.json\z}) {
    # /data/charrels/{}/{}.json
    return static $app, 'application/json; charset=utf-8',
        "local/$path->[1]/$path->[2]/$path->[3].gz",
        gzip => 1;
  }
  if (@$path == 4 and
      $path->[0] eq 'data' and
      $path->[1] eq 'charrels' and
      $path->[2] =~ m{\A[a-z0-9]+\z} and
      $path->[3] =~ m{\A[0-9A-Za-z_-]+\.dat\z}) {
    # /data/charrels/{}/{}.dat
    return static $app, 'application/octet-stream',
        "local/$path->[1]/$path->[2]/$path->[3].gz",
        gzip => 1;
  } elsif (@$path == 5 and
           $path->[0] eq 'data' and
           $path->[1] eq 'charrels' and
           $path->[2] =~ m{\A[a-z0-9]+\z} and
           $path->[3] =~ m{\A[a-z0-9][a-z0-9-]+\z} and
           $path->[4] =~ m{\A[a-z0-9][0-9A-Za-z_-]*\.[0-9a-z]+\z}) {
    # /data/charrels/{}/{}/{}.{}
    return static $app, 'application/octet-stream',
        "local/$path->[1]/$path->[2]/$path->[3]/$path->[4]";
  } elsif (@$path == 3 and
           $path->[0] eq 'data' and
           ($path->[1] eq 'swg') and
           $path->[2] =~ m{\A[A-Za-z0-9][0-9A-Za-z_-]*\.([0-9a-z]+)\z}) {
    # /data/swg/{}
    my $mime = {
    }->{$1} // 'application/octet-stream';
    return static $app, $mime, "local/fonts/$path->[1]/$path->[2]";
  } elsif (@$path == 4 and
           $path->[0] eq 'data' and
           ($path->[1] eq 'opentype' or $path->[1] eq 'bdf') and
           $path->[2] =~ m{\A[A-Za-z0-9][0-9A-Za-z_-]*\z} and
           $path->[3] =~ m{\A[A-Za-z0-9][0-9A-Za-z_-]*\.([0-9a-z]+)\z}) {
    # /data/opentype/{}/{}
    # /data/bdf/{}/{}
    my $mime = {
      css => 'text/css;charset=utf-8',
    }->{$1} // 'application/octet-stream';
    return static $app, $mime,
        "local/fonts/$path->[1]/$path->[2]/$path->[3]";
  } elsif (@$path == 5 and
           $path->[0] eq 'data' and
           ($path->[1] eq 'opentype' or $path->[1] eq 'bdf') and
           $path->[2] =~ m{\A[A-Za-z0-9][0-9A-Za-z_-]*(?:\.[0-9a-zA-Z]+)*\z} and
           $path->[3] =~ m{\A[A-Za-z0-9][0-9A-Za-z_-]*(?:\.[0-9a-zA-Z]+)*\z} and
           $path->[4] =~ m{\A[A-Za-z0-9][0-9A-Za-z_-]*\.([0-9a-z]+)\z}) {
    # /data/opentype/{}/{}/{}
    # /data/bdf/{}/{}/{}
    my $mime = {
      css => 'text/css;charset=utf-8',
    }->{$1} // 'application/octet-stream';
    return static $app, $mime,
        "local/fonts/$path->[1]/$path->[2]/$path->[3]/$path->[4]";
  }
  
  if (@$path == 2 and
      $path->[0] eq 'data' and
      $path->[1] eq 'fonts.json') {
    # /data/fonts.json
    return static $app, 'application/json; charset=utf-8', 'fonts/list.json';
  }
  
  if (@$path == 2 and
      $path->[0] eq 'data' and
      $path->[1] =~ m{\A[0-9A-Za-z_-]+\.json\z}) {
    # /data/{}.json
    return static $app, 'application/json; charset=utf-8', 'local/data/'.$path->[1];
  }
  
  if (@$path == 4 and
      $path->[0] eq 'data' and
      $path->[1] eq 'antenna' and
      $path->[2] =~ m{\A[0-9A-Za-z_-]+\z} and
      $path->[3] =~ m{\A[0-9]{4}-[0-9]{2}\.json\z}) {
    # /data/antenna/{}/{}.json
    return static $app, 'application/json; charset=utf-8', 'local/aggregated/'.$path->[2] . '/' . $path->[3];
  } elsif (@$path == 4 and
           $path->[0] eq 'data' and
           $path->[1] eq 'antenna' and
           $path->[2] eq 'radio' and
           $path->[3] eq 'programs.json') {
    # /data/antenna/radio/programs.json
    return static $app, 'application/json; charset=utf-8', 'local/aggregated/'.$path->[2] . '/' . $path->[3];
  }

  if (@$path >= 3 and $path->[0] eq 'data' and $path->[1] eq 'packs' and
      not grep { not /\A[0-9A-Za-z_][0-9A-Za-z_.-]*\z/ } @$path[2..$#$path]) {
    # /data/packs/...
    return static $app, 'application/octet-stream', 'local/packs/' . join '/', @$path[2..$#$path];
  }

  if (@$path == 2 and
      $path->[0] eq 'fonts' and
      $path->[1] =~ m{\A[0-9A-Za-z_-]+\.ttf\z}) {
    # /fonts/{}.ttf
    return static $app, 'font/ttf', 'fonts/'.$path->[1];
  }
  
  if (@$path == 1 and $path->[0] eq 'robots.txt') {
    # /robots.txt
    return $app->send_plain_text ('');
  }

  if (@$path == 1 and $path->[0] eq 'favicon.ico') {
    # /favicon.ico
    return $app->send_redirect ('https://wiki.suikawiki.org/favicon.ico');
  }

  unless ({
    data => 1, fonts => 1, css => 1, js => 1,
  }->{$path->[0]}) {
    return static $app, 'text/html; charset=utf-8', 'html/year.html';
  }

  return $app->send_error (404);
} # main

1;

=head1 LICENSE

Copyright 2015-2025 Wakaba <wakaba@suikawiki.org>.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Affero General Public License for more details.

You does not have received a copy of the GNU Affero General Public
License along with this program, see <https://www.gnu.org/licenses/>.

=cut
