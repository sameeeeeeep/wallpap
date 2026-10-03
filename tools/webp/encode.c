// Small libwebp driver: raw RGBA stdin -> near-lossless WebP stdout.
#include <stdio.h>
#include <stdlib.h>
#include <webp/encode.h>
static int write_data(const uint8_t *data, size_t size, const WebPPicture *pic) {
  return fwrite(data,1,size,stdout)==size;
}
int main(int argc,char **argv) {
  if(argc!=4)return 2;
  int w=atoi(argv[1]),h=atoi(argv[2]);
  WebPConfig config;WebPPicture pic;
  if(!WebPConfigInit(&config)||!WebPPictureInit(&pic))return 3;
  config.lossless=1;config.quality=75;config.method=6;config.near_lossless=atoi(argv[3]);
  config.alpha_quality=100;config.exact=0;
  if(!WebPValidateConfig(&config))return 4;
  pic.use_argb=1;pic.width=w;pic.height=h;pic.writer=write_data;
  size_t bytes=(size_t)w*h*4;uint8_t *rgba=malloc(bytes);
  if(!rgba||fread(rgba,1,bytes,stdin)!=bytes)return 5;
  if(!WebPPictureImportRGBA(&pic,rgba,w*4))return 6;
  int ok=WebPEncode(&config,&pic);WebPPictureFree(&pic);free(rgba);
  return ok?0:7;
}
