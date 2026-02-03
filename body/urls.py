from django.urls import path

from . import views

urlpatterns = [
    path('', views.board, name='board'),
    path('api/roll/', views.roll, name='roll'),
    path('api/reset/', views.reset_game, name='reset_game'),
]
