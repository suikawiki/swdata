package SWD::Web;
use strict;
use warnings;
use Path::Tiny;
use Promise;
use Promised::File;
use JSON::PS;
use Wanage::HTTP;
use Warabe::App;
use Temma;

sub psgi_app ($) {
  my ($class) = @_;

  return sub {
    ## This is necessary so that different forked siblings have
    ## different seeds.
    srand;

    ## XXX Parallel::Prefork (?)
    delete $SIG{CHLD};
    delete $SIG{CLD};

    my $http = Wanage::HTTP->new_from_psgi_env ($_[0]);
    my $app = Warabe::App->new_from_http ($http);

    # XXX accesslog
    warn sprintf "Access: [%s] %s %s\n",
        scalar gmtime, $app->http->request_method, $app->http->url->stringify;

    return $app->execute_by_promise (sub {
      return $class->main ($app);
    });
  };
} # psgi_app

use Path::Class; # XXX
my $TemplatesD = file (__FILE__)->dir->parent->parent->subdir ('templates');
sub temma ($$$) {
  my ($app, $template_path, $args) = @_;
  my $http = $app->http;
  $http->response_mime_type->set_value ('text/html');
  $http->response_mime_type->set_param (charset => 'utf-8');
  my $fh = SWD::Web::Temma::Printer->new_from_http ($http);
  $args->{app} = $app;
  return Promise->new (sub {
    my $ok = $_[0];
    Temma->process_html
        ($TemplatesD->file (@$template_path), $args => $fh,
         sub { undef $fh; $http->close_response_body; $ok->() });
  });
} # temma

my $RootPath = path (__FILE__)->parent->parent->parent;

sub static ($$$) {
  my ($app, $type, $name) = @_;
  $app->http->set_response_header ('Content-Type' => $type);
  my $file = Promised::File->new_from_path ($RootPath->child ($name));
  return $file->stat->then (sub {
    $app->http->set_response_last_modified ($_[0]->mtime);
    return $file->read_byte_string;
  })->then (sub {
    $app->http->send_response_body_as_ref (\($_[0]));
    $app->http->close_response_body;
  });
} # static

sub main ($$$) {
  my ($class, $app) = @_;
  my $path = $app->path_segments;

  if (@$path == 1 and $path->[0] eq '') {
    # /
    return temma $app, ['index.html.tm'], {};
  }

  if (@$path == 2 and $path->[0] eq 'css' and $path->[1] eq 'common.css') {
    return static $app, 'text/css; charset=utf-8', 'css/common.css';
  }

  return $app->send_error (404);
} # main

package SWD::Web::Temma::Printer;

sub new_from_http ($$) {
  return bless {http => $_[1], value => ''}, $_[0];
} # new_from_http

sub print ($$) {
  $_[0]->{value} .= $_[1];
  if (length $_[0]->{value} > 1024*10 or length $_[1] == 0) {
    $_[0]->{http}->send_response_body_as_text ($_[0]->{value});
    $_[0]->{value} = '';
  }
} # print

sub DESTROY {
  $_[0]->{http}->send_response_body_as_text ($_[0]->{value})
      if length $_[0]->{value};
} # DESTROY

1;

=head1 LICENSE

Copyright 2015 Wakaba <wakaba@suikawiki.org>.

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

=cut
