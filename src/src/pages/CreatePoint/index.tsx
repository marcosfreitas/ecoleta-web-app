import React, { useEffect, useState, ChangeEvent, MouseEvent, createRef, FormEvent } from 'react';
import { FiArrowLeft, FiAlertOctagon } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { Map, TileLayer, Marker } from 'react-leaflet';
import { LeafletMouseEvent, LeafletEvent, DragEndEvent } from 'leaflet';
import axios from 'axios';

import api from '../../services/api';

import './styles.css';
import logo from '../../assets/logo.svg';

interface Item {
	id: number;
	title: string;
	image_url: string;
}

interface IBGEStateResponse {
	id: number,
	sigla: string,
	nome: string,
	// regiao: object
}

interface IBGECityResponse {
	id: number,
	nome: string,
	//microrregiao: object
}

interface Coordinate {
	lat: number,
	lng: number
}

const CreatePoint = () => {

	/**
	 * @info Always that we create a state for an Array or a Object,
	 * We do need to inform which type of variables will be stored into this.
	 *
	 * Use state receive an Array of Items
	 */
	const [items, setItems] = useState<Item[]>([]);
	const [states, setStates] = useState<IBGEStateResponse[]>([]);
	const [cities, setCities] = useState<IBGECityResponse[]>([]);

	const [formData, setFormData] = useState({
		name: '',
		email: '',
		whatsapp: ''
	});

	const [selectedState, setSelectedState] = useState('0');
	const [selectedCity, setSelectedCity] = useState('0');
	const [selectedItems, setSelectedItems] = useState<number[]>([]);
	const [markerReference, setMarkerReference] = useState(createRef<Marker>());

	const [initialCoordinates, setInitialCoordinates] = useState<Coordinate>({lat: 0, lng: 0});
	const [pointCoordinates, setPointCoordinates] = useState<Coordinate>({lat: 0, lng: 0});

	/**
	 * Get initial geolocation
	 */
	useEffect(() => {
		navigator.geolocation.getCurrentPosition(position => {
			setInitialCoordinates({
				lat: position.coords.latitude,
				lng: position.coords.longitude
			});
			setPointCoordinates({
				lat: position.coords.latitude,
				lng: position.coords.longitude
			});
		});
	}, []);

	/**
	 * @info executes a function when something's state change or once (empty array passed)
	 */
	useEffect(() => {
		api.get('items').then(response => {
			setItems(response.data);
		})
	}, [] );

	/**
	 * Retrieving IBGE states
	 */
	useEffect(() => {
		axios
			.get<IBGEStateResponse[]>('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
			.then(response => {
				const stateList = response.data.map(state => {
					return {
						id: state.id,
						sigla: state.sigla,
						nome: state.nome
					}
				});

				setStates(stateList);
			})
		;
	}, []);

	/**
	 * Retrieving cities from selected IBGE state
	 */
	useEffect(() => {

		if (selectedState === '0') {
			return;
		}

		setCities([]);

		axios
			.get<IBGECityResponse[]>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios
			?orderBy=nome`)
			.then(response => {

				const cityList = response.data.map(city => {
					return {
						id: city.id,
						nome: city.nome
					}
				});

				setCities(cityList)
			})
		;
	}, [selectedState]);


	/**
	 * Handle functions
	 */

	function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
		const {name, value} = event.target;

		/**
		 * Using spread operator to not override other fields when define a value for a single field
		 * because setFormData replace all the object
		 */
		setFormData({ ...formData, [name]: value });
	}

	function handleSelectStateChange(event: ChangeEvent<HTMLSelectElement>) {
		setSelectedState(event.target.value);
	}

	function handleSelectCityChange(event: ChangeEvent<HTMLSelectElement>) {
		setSelectedCity(event.target.value);
	}

	function handleSelectedRecycleItemClick(id: number, event: MouseEvent) {
		event.currentTarget.classList.toggle('selected');

		const alreadySelected = selectedItems.findIndex(item => item === id);

		if (alreadySelected >= 0) {
			const filteredItems = selectedItems.filter(item => item !== id);
			setSelectedItems(filteredItems);
		} else {
			setSelectedItems([ ...selectedItems, id ]);
		}

	}

	function handleMapClick(event: LeafletMouseEvent) {

		const currentMarker = event.target;
		setMarkerReference(currentMarker);
		setPointCoordinates(event.latlng);

	}

	function handleMapDragend(event: DragEndEvent) {

		const currentMarker = event.target;
		setMarkerReference(currentMarker);
		setPointCoordinates(currentMarker.getLatLng());

	}

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();

		const { name, email, whatsapp } = formData;
		const state = selectedState;
		const city = selectedCity;
		const { lat, lng } = pointCoordinates;
		const items = selectedItems;

		const data = {
			name,
			email,
			phones: [
				(whatsapp).toString()
			],
			state,
			city,
			coordinates: {
				lat,
				lng
			},
			items
		}

		console.log(data);

		await api.post('points', data);

		alert('Ponto de Coleta cadastrado com sucesso.');

	}

	return (
		<section id="page-create-point">
			<header>
				<img src={logo} alt="Ecoleta"/>

				<Link to="/">
					<FiArrowLeft />
					Voltar para o início
				</Link>
			</header>

			<form onSubmit={handleSubmit}>
				<h1>Cadastro do <br/>ponto de coleta</h1>

				<fieldset>
					<legend>
						<h2>Dados da entidade</h2>
					</legend>

					<div className="field">
						<label htmlFor="name">Nome da entidade</label>
						<input
							required
							type="text"
							name="name"
							id="name"
							onChange={handleInputChange}
						/>
					</div>

					<div className="field-group">
						<div className="field">
							<label htmlFor="email">E-mail</label>
							<input
								required
								type="text"
								name="email"
								id="email"
								onChange={handleInputChange}
							/>
						</div>
						<div className="field">
							<label htmlFor="whatsapp">Whatsapp</label>
							<input
								required
								type="text"
								name="whatsapp"
								id="whatsapp"
								onChange={handleInputChange}
							/>
						</div>
					</div>
				</fieldset>

				<fieldset>
					<legend>
						<h2>Endereço</h2>
						<span>Selecione o endereço no mapa</span>
					</legend>

					<Map center={[initialCoordinates.lat, initialCoordinates.lng]} zoom={15} onClick={handleMapClick}>
						<TileLayer
							id='mapbox/streets-v11'
							accessToken='pk.eyJ1IjoibWFyY29vcyIsImEiOiJja2I1dXVndTAwMXc5MnFvMnY2b3YyN3NyIn0.sPIEDvGqIEqu6XlVGlxtSQ'
							attribution='Map data © <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery (c) <a href="https://www.mapbox.com/">Mapbox</a>'
							url="https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}"
						/>
						<Marker
							draggable={true}
							onDragend={handleMapDragend}
							position={[pointCoordinates.lat, pointCoordinates.lng]}
						/>
					</Map>

					<div className="field-group">
						<div className="field">
							<label htmlFor="state">Estado</label>
							<select required onChange={handleSelectStateChange} name="state" id="state">
								<option value="0">Selecione um estado...</option>
								{
									states.map(state => (
										<option value={state.sigla} key={state.id}>
											{state.nome}
										</option>
									))
								}
							</select>
						</div>
						<div className="field">
							<label htmlFor="city">Cidade</label>
							<select required onChange={handleSelectCityChange} name="city" id="city">
								{
									cities.length > 0 &&
									<option value="0">Selecione uma cidade...</option>
								}

								{
									cities.length > 0 &&

										cities.map(city => (
											<option value={city.nome} key={city.id}>
												{city.nome}
											</option>
										))
								}

								{
									cities.length === 0 &&
										<option value="">...</option>
								}
							</select>
						</div>
					</div>
				</fieldset>

				<fieldset>
					<legend>
						<h2>Itens de Coleta</h2>
						<span>Selecione um ou mais ítens abaixo</span>
					</legend>

					<ul className="items-grid">
						{
							items.map(item => (
								<li key={item.id} onClick={(e) => handleSelectedRecycleItemClick(item.id, e)}>
									<img src={item.image_url} alt={item.title}/>
									<span>{item.title}</span>
								</li>
							))
						}
					</ul>
				</fieldset>

				<button type="submit">Cadastrar ponto de coleta</button>

			</form>
		</section>
	)
}

export default CreatePoint;